const { pool } = require('../config/db');
const {
  resolveActiveContract,
  computeAttendanceAndLeaves,
  evaluateSalaryRules,
  scanWarnings
} = require('../services/payrollEngine');
const { generatePayslipPDF } = require('../services/pdfService');
const { sendPayslipEmail } = require('../services/emailService');

// --- WIZARD STEP 2: Query Eligible Employees for Selection ---
// GET /api/payruns/eligible-employees?salary_structure_id=X&period_start=Y&period_end=Z
exports.getEligibleEmployees = async (req, res) => {
  try {
    const { salary_structure_id, period_start, period_end } = req.query;

    if (!salary_structure_id || !period_start || !period_end) {
      return res.status(400).json({
        success: false,
        message: 'salary_structure_id, period_start, and period_end are required'
      });
    }

    const [rows] = await pool.execute(
      `SELECT 
        e.id AS employee_id,
        e.employee_code,
        CONCAT(e.first_name, ' ', e.last_name) AS full_name,
        e.email,
        d.name AS department_name,
        jp.title AS job_position_title,
        c.id AS contract_id,
        c.wage AS contract_wage,
        c.reference_name AS contract_reference,
        c.start_date,
        CASE WHEN e.bank_account_no IS NOT NULL AND e.bank_account_no != '' THEN 1 ELSE 0 END AS has_bank_details
       FROM contracts c
       JOIN employees e ON c.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN job_positions jp ON e.job_position_id = jp.id
       WHERE c.salary_structure_id = ?
         AND c.status = 'ACTIVE'
         AND e.employment_status = 'ACTIVE'
         AND c.start_date <= ?
         AND (c.end_date IS NULL OR c.end_date >= ?)
       ORDER BY e.employee_code ASC`,
      [salary_structure_id, period_end, period_start]
    );

    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- WIZARD FINALIZE: Create Payrun with Selected Employees ---
// POST /api/payruns
exports.createPayrun = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let { name, period_start, period_end, salary_structure_id, selected_employee_ids } = req.body;

    if (!selected_employee_ids || !Array.isArray(selected_employee_ids) || selected_employee_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one employee' });
    }

    const pStart = period_start || '2026-09-01';
    const pEnd = period_end || '2026-09-30';
    const structureId = parseInt(salary_structure_id, 10) || 1;
    const finalName = (name && String(name).trim()) || `Pay Run ${pStart} to ${pEnd}`;
    const createdBy = req.user?.id || null;

    // 1. Create Payrun in DRAFT status
    const [result] = await connection.execute(
      `INSERT INTO payruns (name, period_start, period_end, salary_structure_id, status, total_employees, created_by_user_id) 
       VALUES (?, ?, ?, ?, 'DRAFT', ?, ?)`,
      [finalName, pStart, pEnd, structureId, selected_employee_ids.length, createdBy]
    );

    const payrunId = result.insertId;

    // 2. Initialize draft payslips for selected employees
    for (const empId of selected_employee_ids) {
      let activeContract = await resolveActiveContract(empId, pStart, pEnd);
      if (!activeContract) {
        const [fallback] = await connection.execute(
          'SELECT * FROM contracts WHERE employee_id = ? ORDER BY id DESC LIMIT 1',
          [empId]
        );
        activeContract = fallback[0] || null;
      }

      const contractId = activeContract ? activeContract.id : null;
      const cStart = activeContract?.start_date ? new Date(activeContract.start_date).toISOString().split('T')[0] : pStart;
      const effectiveStart = cStart > pStart ? cStart : pStart;

      await connection.execute(
        `INSERT INTO payslips (payrun_id, employee_id, contract_id, period_start, period_end, status) 
         VALUES (?, ?, ?, ?, ?, 'DRAFT')`,
        [payrunId, empId, contractId, effectiveStart, pEnd]
      );
    }

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Payrun batch created successfully',
      data: { id: payrunId, name: finalName, period_start: pStart, period_end: pEnd, total_employees: selected_employee_ids.length }
    });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// GET /api/payruns
exports.getPayruns = async (req, res) => {
  try {
    const [payruns] = await pool.execute(`
      SELECT 
        p.*,
        ss.name AS salary_structure_name,
        ss.code AS salary_structure_code
      FROM payruns p
      JOIN salary_structures ss ON p.salary_structure_id = ss.id
      ORDER BY p.id DESC
    `);
    res.status(200).json({ success: true, count: payruns.length, data: payruns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payruns/:id (with Payslips & Warnings)
exports.getPayrunById = async (req, res) => {
  try {
    const payrunId = req.params.id;

    const [payruns] = await pool.execute(
      `SELECT p.*, ss.name AS salary_structure_name, ss.code AS salary_structure_code 
       FROM payruns p 
       JOIN salary_structures ss ON p.salary_structure_id = ss.id 
       WHERE p.id = ?`,
      [payrunId]
    );

    if (payruns.length === 0) {
      return res.status(404).json({ success: false, message: 'Payrun not found' });
    }

    const payrun = payruns[0];

    // Query child payslips
    const [payslips] = await pool.execute(
      `SELECT 
        ps.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        d.name AS department_name,
        COALESCE(c.wage, act_c.wage, 0) AS contract_wage,
        COALESCE(c.reference_name, act_c.reference_name, 'Standard Contract') AS contract_reference
       FROM payslips ps
       JOIN employees e ON ps.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN contracts c ON ps.contract_id = c.id
       LEFT JOIN contracts act_c ON act_c.id = (
         SELECT id FROM contracts WHERE employee_id = e.id AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1
       )
       WHERE ps.payrun_id = ?
       ORDER BY e.employee_code ASC`,
      [payrunId]
    );

    // Query warnings
    const [warnings] = await pool.execute(
      `SELECT pw.*, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name
       FROM payroll_warnings pw
       JOIN employees e ON pw.employee_id = e.id
       WHERE pw.payrun_id = ?`,
      [payrunId]
    );

    res.status(200).json({
      success: true,
      data: payrun,
      payslips,
      warnings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/payruns/:id/compute (Evaluates rules & scans warnings)
exports.computePayrun = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const payrunId = req.params.id;
    const [[payrun]] = await connection.execute('SELECT * FROM payruns WHERE id = ?', [payrunId]);

    if (!payrun) {
      return res.status(404).json({ success: false, message: 'Payrun not found' });
    }

    // Get salary rules for the assigned structure
    const [rules] = await connection.execute(
      'SELECT * FROM salary_rules WHERE structure_id = ? ORDER BY sequence ASC',
      [payrun.salary_structure_id]
    );

    const [payslips] = await connection.execute(
      `SELECT ps.*, e.id AS emp_id, e.employee_code, e.first_name, e.last_name, e.bank_account_no
       FROM payslips ps
       JOIN employees e ON ps.employee_id = e.id
       WHERE ps.payrun_id = ?`,
      [payrunId]
    );

    // Clear old lines and warnings for recompute
    await connection.execute('DELETE FROM payroll_warnings WHERE payrun_id = ?', [payrunId]);
    for (const slip of payslips) {
      await connection.execute('DELETE FROM payslip_lines WHERE payslip_id = ?', [slip.id]);
    }

    let batchGross = 0;
    let batchDeductions = 0;
    let batchNet = 0;
    let warningCount = 0;

    for (const slip of payslips) {
      let activeContract = await resolveActiveContract(slip.employee_id, payrun.period_start, payrun.period_end);
      if (!activeContract) {
        const [fallback] = await connection.execute(
          'SELECT * FROM contracts WHERE employee_id = ? ORDER BY id DESC LIMIT 1',
          [slip.employee_id]
        );
        activeContract = fallback[0] || null;
      }

      if (!activeContract) {
        warningCount++;
        await connection.execute(
          `INSERT INTO payroll_warnings (payrun_id, payslip_id, employee_id, warning_type, severity, message) 
           VALUES (?, ?, ?, 'NO_ACTIVE_CONTRACT', 'WARNING', ?)`,
          [payrunId, slip.id, slip.employee_id, `Employee ${slip.employee_code} has no active contract configured.`]
        );
        continue;
      }

      // Compute attendance worked days and unpaid leaves bounded by contract and in/out punches
      const { scheduledWorkDays, workedDays, workedHours, effectivePeriodStart, effectivePeriodEnd, unpaidLeaveDays } = await computeAttendanceAndLeaves(
        slip.employee_id,
        payrun.period_start,
        payrun.period_end,
        activeContract
      );

      // Evaluate sequenced salary rules based on contract wage
      const { lines, grossSalary, totalDeductions, netSalary } = evaluateSalaryRules(
        rules,
        activeContract.wage,
        scheduledWorkDays,
        workedDays,
        unpaidLeaveDays
      );

      // Scan warnings
      const warnings = await scanWarnings(
        slip,
        activeContract,
        netSalary,
        payrunId,
        payrun.period_start,
        payrun.period_end
      );

      for (const w of warnings) {
        warningCount++;
        const warnEmpId = slip.employee_id || w.employee_id;
        await connection.execute(
          `INSERT INTO payroll_warnings (payrun_id, payslip_id, employee_id, warning_type, severity, message) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [payrunId, slip.id, warnEmpId, w.warning_type, w.severity || 'WARNING', w.message]
        );
      }

      // Update payslip record with contract-bound period and attendances
      await connection.execute(
        `UPDATE payslips SET
          contract_id = ?,
          period_start = ?,
          period_end = ?,
          scheduled_work_days = ?,
          worked_days = ?,
          unpaid_leave_days = ?,
          gross_salary = ?,
          total_deductions = ?,
          net_salary = ?,
          status = 'COMPUTED'
         WHERE id = ?`,
        [
          activeContract.id || null,
          effectivePeriodStart || payrun.period_start,
          effectivePeriodEnd || payrun.period_end,
          scheduledWorkDays != null ? scheduledWorkDays : 22,
          workedDays != null ? workedDays : 22,
          unpaidLeaveDays != null ? unpaidLeaveDays : 0,
          grossSalary != null ? grossSalary : 0,
          totalDeductions != null ? totalDeductions : 0,
          netSalary != null ? netSalary : 0,
          slip.id
        ]
      );

      // Insert calculated payslip lines
      for (const line of lines) {
        await connection.execute(
          `INSERT INTO payslip_lines (payslip_id, salary_rule_id, rule_code, rule_name, category, sequence, rate_or_percentage, amount) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            slip.id,
            line.salary_rule_id || null,
            line.rule_code || 'RULE',
            line.rule_name || 'Salary Rule',
            line.category || 'BASIC',
            line.sequence != null ? line.sequence : 1,
            line.rate_or_percentage != null ? line.rate_or_percentage : null,
            line.amount != null ? line.amount : 0
          ]
        );
      }

      batchGross += grossSalary;
      batchDeductions += totalDeductions;
      batchNet += netSalary;
    }

    // Update parent Payrun totals
    await connection.execute(
      `UPDATE payruns SET
        status = 'COMPUTED',
        total_gross = ?,
        total_deductions = ?,
        total_net = ?,
        warnings_count = ?
       WHERE id = ?`,
      [batchGross, batchDeductions, batchNet, warningCount, payrunId]
    );

    await connection.commit();
    res.status(200).json({
      success: true,
      message: 'Payrun computed successfully',
      data: {
        id: payrunId,
        total_gross: batchGross,
        total_deductions: batchDeductions,
        total_net: batchNet,
        warnings_count: warningCount
      }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// POST /api/payruns/:id/validate (Locks & Finalizes)
exports.validatePayrun = async (req, res) => {
  try {
    const payrunId = req.params.id;
    const [[payrun]] = await pool.execute('SELECT * FROM payruns WHERE id = ?', [payrunId]);

    if (!payrun) {
      return res.status(404).json({ success: false, message: 'Payrun not found' });
    }

    // Check for unresolved blocking warnings (CRITICAL severity)
    const [criticalWarnings] = await pool.execute(
      'SELECT id, warning_type, message FROM payroll_warnings WHERE payrun_id = ? AND severity = "CRITICAL"',
      [payrunId]
    );

    if (criticalWarnings.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot validate payrun: Found ${criticalWarnings.length} unresolved blocking critical warning(s). Please resolve them before validating.`,
        warnings: criticalWarnings
      });
    }

    await pool.execute('UPDATE payruns SET status = "VALIDATED", validated_at = NOW() WHERE id = ?', [payrunId]);
    await pool.execute('UPDATE payslips SET status = "VALIDATED" WHERE payrun_id = ?', [payrunId]);

    res.status(200).json({ success: true, message: 'Payrun validated and locked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/payruns/:id/mark-paid
exports.markPaid = async (req, res) => {
  try {
    const payrunId = req.params.id;
    const [[payrun]] = await pool.execute('SELECT * FROM payruns WHERE id = ?', [payrunId]);

    if (!payrun) {
      return res.status(404).json({ success: false, message: 'Payrun not found' });
    }

    await pool.execute('UPDATE payruns SET status = "PAID", paid_at = NOW() WHERE id = ?', [payrunId]);
    await pool.execute('UPDATE payslips SET status = "PAID" WHERE payrun_id = ?', [payrunId]);

    res.status(200).json({ success: true, message: 'Payrun marked as PAID successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payruns/my-latest-payslip
exports.getMyLatestPayslip = async (req, res) => {
  try {
    let employeeId = req.user.employeeId;
    if (!employeeId) {
      const [emps] = await pool.query(
        'SELECT id FROM employees WHERE user_id = ? OR email = ?',
        [req.user.id, req.user.email]
      );
      employeeId = emps[0]?.id || null;
    }

    if (!employeeId) {
      return res.status(200).json({ success: true, data: null, contract: null });
    }

    // Active contract
    const [[activeContract]] = await pool.execute(
      `SELECT * FROM contracts WHERE employee_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
      [employeeId]
    );

    // Latest payslip
    const [payslips] = await pool.execute(
      `SELECT 
        ps.*,
        pr.name AS payrun_name,
        pr.status AS payrun_status,
        COALESCE(c.wage, act_c.wage, 0) AS contract_wage,
        COALESCE(c.reference_name, act_c.reference_name, 'Standard Contract') AS contract_reference,
        COALESCE(c.start_date, act_c.start_date) AS contract_start_date,
        COALESCE(c.end_date, act_c.end_date) AS contract_end_date
      FROM payslips ps
      JOIN payruns pr ON ps.payrun_id = pr.id
      LEFT JOIN contracts c ON ps.contract_id = c.id
      LEFT JOIN contracts act_c ON act_c.id = (
        SELECT id FROM contracts WHERE employee_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1
      )
      WHERE ps.employee_id = ?
      ORDER BY ps.period_start DESC, ps.id DESC
      LIMIT 1`,
      [employeeId, employeeId]
    );

    const latest = payslips[0] || null;

    res.status(200).json({
      success: true,
      data: latest,
      contract: activeContract || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payruns/my-payslips
exports.getMyPayslips = async (req, res) => {
  try {
    let employeeId = req.user.employeeId;
    if (!employeeId) {
      const [emps] = await pool.query(
        'SELECT id FROM employees WHERE user_id = ? OR email = ?',
        [req.user.id, req.user.email]
      );
      employeeId = emps[0]?.id || null;
    }

    if (!employeeId) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const [payslips] = await pool.execute(
      `SELECT 
        ps.*,
        pr.name AS payrun_name,
        pr.status AS payrun_status,
        COALESCE(c.wage, act_c.wage, 0) AS contract_wage,
        COALESCE(c.reference_name, act_c.reference_name, 'Standard Contract') AS contract_reference
      FROM payslips ps
      JOIN payruns pr ON ps.payrun_id = pr.id
      LEFT JOIN contracts c ON ps.contract_id = c.id
      LEFT JOIN contracts act_c ON act_c.id = (
        SELECT id FROM contracts WHERE employee_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1
      )
      WHERE ps.employee_id = ?
      ORDER BY ps.period_start DESC, ps.id DESC`,
      [employeeId, employeeId]
    );

    res.status(200).json({ success: true, count: payslips.length, data: payslips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payruns/payslips/:id (JSON Statement)
exports.getPayslipById = async (req, res) => {
  try {
    const payslipId = req.params.id;
    const [[payslip]] = await pool.execute(`
      SELECT 
        ps.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.bank_account_no,
        d.name AS department_name,
        jp.title AS job_position_title,
        COALESCE(c.reference_name, act_c.reference_name, 'Standard Contract') AS contract_reference,
        COALESCE(c.wage, act_c.wage, 0) AS contract_wage,
        COALESCE(c.start_date, act_c.start_date) AS contract_start_date,
        COALESCE(c.end_date, act_c.end_date) AS contract_end_date,
        pr.name AS payrun_name
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN contracts c ON ps.contract_id = c.id
      LEFT JOIN contracts act_c ON act_c.id = (
        SELECT id FROM contracts WHERE employee_id = e.id AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1
      )
      LEFT JOIN payruns pr ON ps.payrun_id = pr.id
      WHERE ps.id = ?
    `, [payslipId]);

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    if (req.user && req.user.role === 'EMPLOYEE') {
      const userEmpId = req.user.employeeId || req.user.employee?.id;
      if (userEmpId && payslip.employee_id !== userEmpId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    // Query attendance check-in and check-out total hours for this payslip's period
    const [[attSummary]] = await pool.execute(
      `SELECT 
         COALESCE(SUM(worked_hours), 0) AS total_hours,
         COUNT(DISTINCT attendance_date) AS attended_days
       FROM attendances
       WHERE employee_id = ? 
         AND attendance_date BETWEEN ? AND ?`,
      [payslip.employee_id, payslip.period_start, payslip.period_end]
    );

    const attendedHrs = parseFloat(attSummary?.total_hours) || 0;
    const wageNum = parseFloat(payslip.contract_wage || 0);
    const scheduledDaysNum = parseFloat(payslip.scheduled_work_days || 22);
    const workedDaysNum = parseFloat(payslip.worked_days || 22);
    const perDayWage = scheduledDaysNum > 0 ? Math.round((wageNum / scheduledDaysNum) * 100) / 100 : wageNum;
    const earnedWage = Math.round(perDayWage * workedDaysNum * 100) / 100;
    const workedHours = attendedHrs > 0 ? Math.round(attendedHrs * 10) / 10 : Math.round(workedDaysNum * 8.0 * 10) / 10;

    const cStartFormatted = payslip.contract_start_date 
      ? new Date(payslip.contract_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Jan 1, 2026';
    const cEndFormatted = payslip.contract_end_date
      ? new Date(payslip.contract_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Indefinite / Permanent';
    const contractDuration = `${cStartFormatted} to ${cEndFormatted}`;

    const [lines] = await pool.execute(
      'SELECT * FROM payslip_lines WHERE payslip_id = ? ORDER BY sequence ASC',
      [payslipId]
    );

    let basicAmount = 0;
    let allowanceAmount = 0;
    let deductionAmount = 0;
    for (const l of lines) {
      const amt = parseFloat(l.amount) || 0;
      const cat = String(l.category || '').toUpperCase();
      const code = String(l.rule_code || '').toUpperCase();
      if (cat === 'BASIC' || code === 'BASIC') {
        basicAmount += amt;
      } else if (cat === 'ALLOWANCE' || code === 'HRA' || code === 'SPECIAL_ALLOWANCE' || code === 'SPL_ALW') {
        allowanceAmount += amt;
      } else if (cat === 'DEDUCTION' || code === 'PF' || code === 'PF_DED' || code === 'TAX' || code === 'TDS_TAX') {
        deductionAmount += amt;
      }
    }
    if (basicAmount === 0 && payslip.contract_wage) {
      basicAmount = Math.round(parseFloat(payslip.contract_wage) * 0.50);
    }

    res.status(200).json({
      success: true,
      data: {
        ...payslip,
        lines,
        employeeName: `${payslip.first_name} ${payslip.last_name}`,
        department: payslip.department_name || 'General',
        jobPosition: payslip.job_position_title || 'Staff',
        contractWage: wageNum,
        perDayWage,
        dailyWage: perDayWage,
        earnedWage,
        presentDays: workedDaysNum,
        contractReference: payslip.contract_reference,
        contractStartDate: payslip.contract_start_date,
        contractEndDate: payslip.contract_end_date,
        contractDuration,
        standardShift: '09:00 AM – 06:00 PM (8 hrs/day)',
        periodStart: payslip.period_start,
        periodEnd: payslip.period_end,
        workedDays: workedDaysNum,
        workedHours,
        scheduledWorkDays: scheduledDaysNum,
        basic: basicAmount,
        basicSalary: basicAmount,
        allowances: allowanceAmount,
        totalAllowances: allowanceAmount,
        deductions: deductionAmount || parseFloat(payslip.total_deductions || 0),
        grossSalary: parseFloat(payslip.gross_salary || 0),
        gross: parseFloat(payslip.gross_salary || 0),
        totalDeductions: parseFloat(payslip.total_deductions || 0),
        netSalary: parseFloat(payslip.net_salary || 0),
        net: parseFloat(payslip.net_salary || 0),
        ruleLineItems: lines.map(l => ({
          code: l.rule_code,
          ruleCode: l.rule_code,
          name: l.rule_name,
          ruleName: l.rule_name,
          category: l.category,
          amount: parseFloat(l.amount)
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payruns/payslips/:id/pdf (Print PDF)
exports.printPayslipPDF = async (req, res) => {
  try {
    const payslipId = req.params.id;

    const [[payslip]] = await pool.execute('SELECT * FROM payslips WHERE id = ?', [payslipId]);
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    // If requester is an EMPLOYEE, verify they own this payslip
    if (req.user && req.user.role === 'EMPLOYEE') {
      const userEmpId = req.user.employeeId || req.user.employee?.id;
      if (userEmpId && payslip.employee_id !== userEmpId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only access your own payslip.' });
      }
    }

    const [[employee]] = await pool.execute('SELECT * FROM employees WHERE id = ?', [payslip.employee_id]);
    const [[contract]] = await pool.execute('SELECT * FROM contracts WHERE id = ?', [payslip.contract_id]);
    const [[payrun]] = await pool.execute('SELECT * FROM payruns WHERE id = ?', [payslip.payrun_id]);
    const [lines] = await pool.execute('SELECT * FROM payslip_lines WHERE payslip_id = ? ORDER BY sequence ASC', [payslipId]);

    const pdfBuffer = await generatePayslipPDF(payslip, lines, employee, contract, payrun);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Payslip_${employee?.employee_code || payslip.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/payruns/:id/send-payslips (Bulk Email Distribution)
exports.sendPayslips = async (req, res) => {
  try {
    const payrunId = req.params.id;
    const [[payrun]] = await pool.execute('SELECT * FROM payruns WHERE id = ?', [payrunId]);
    if (!payrun) {
      return res.status(404).json({ success: false, message: 'Payrun not found' });
    }

    const [payslips] = await pool.execute(
      `SELECT 
         ps.*, 
         e.employee_code, 
         e.first_name, 
         e.last_name, 
         e.email,
         e.bank_name,
         e.bank_account_no,
         d.name AS department_name,
         jp.title AS job_position_title,
         c.wage AS contract_wage,
         c.reference_name AS contract_reference
       FROM payslips ps 
       JOIN employees e ON ps.employee_id = e.id 
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN job_positions jp ON e.job_position_id = jp.id
       LEFT JOIN contracts c ON ps.contract_id = c.id
       WHERE ps.payrun_id = ?`,
      [payrunId]
    );

    let sentCount = 0;
    let failedCount = 0;
    const deliveryResults = [];

    const BATCH_SIZE = 10;
    for (let i = 0; i < payslips.length; i += BATCH_SIZE) {
      const chunk = payslips.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map(async (slip) => {
          if (!slip.email || !slip.email.trim()) {
            failedCount++;
            deliveryResults.push({ employee_code: slip.employee_code, status: 'FAILED', reason: 'No email address configured' });
            return;
          }

          try {
            const [lines] = await pool.execute('SELECT * FROM payslip_lines WHERE payslip_id = ? ORDER BY sequence ASC', [slip.id]);

            const basicLines = lines.filter(l => l.category === 'BASIC');
            const allowanceLines = lines.filter(l => l.category === 'ALLOWANCE');
            const deductionLines = lines.filter(l => l.category === 'DEDUCTION');

            const basicSalary = basicLines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
            const totalAllowances = allowanceLines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
            const totalDeductions = deductionLines.reduce((acc, l) => acc + Number(l.amount || 0), 0);

            const pdfBuffer = await generatePayslipPDF(slip, lines, slip, { wage: slip.contract_wage }, payrun);

            const result = await sendPayslipEmail({
              employeeEmail: slip.email.trim(),
              employeeName: `${slip.first_name} ${slip.last_name}`,
              employeeCode: slip.employee_code,
              departmentName: slip.department_name,
              jobTitle: slip.job_position_title,
              periodName: payrun.name,
              periodStart: slip.period_start,
              periodEnd: slip.period_end,
              basicSalary,
              basicLines,
              allowanceLines,
              totalAllowances,
              grossSalary: Number(slip.gross_salary || (basicSalary + totalAllowances)),
              deductionLines,
              totalDeductions: Number(slip.total_deductions || totalDeductions),
              netSalary: Number(slip.net_salary),
              bankName: slip.bank_name,
              bankAccount: slip.bank_account_no,
              pdfBuffer
            });

            if (result.success) {
              sentCount++;
              await pool.execute('UPDATE payslips SET delivery_status = "SENT", sent_at = NOW() WHERE id = ?', [slip.id]);
              deliveryResults.push({ employee_code: slip.employee_code, email: slip.email, status: 'SENT', previewUrl: result.previewUrl });
            } else {
              failedCount++;
              await pool.execute('UPDATE payslips SET delivery_status = "FAILED" WHERE id = ?', [slip.id]);
              deliveryResults.push({ employee_code: slip.employee_code, email: slip.email, status: 'FAILED', error: result.error });
            }
          } catch (err) {
            failedCount++;
            deliveryResults.push({ employee_code: slip.employee_code, status: 'FAILED', error: err.message });
          }
        })
      );
    }

    res.status(200).json({
      success: true,
      message: `Bulk delivery completed: ${sentCount} sent, ${failedCount} failed`,
      sentCount,
      failedCount,
      results: deliveryResults
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/payruns/distribute-monthly (On-demand End-of-Month Payroll Distribution)
exports.triggerMonthlyDistribution = async (req, res) => {
  try {
    const { payrunId, force } = req.body;
    const { runMonthlyPayrollEmailJob } = require('../services/payrollScheduler');
    const result = await runMonthlyPayrollEmailJob({ payrunId, force: force === true });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/payruns/test-email (Live Diagnostic to verify real Gmail delivery)
exports.testEmailDelivery = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid recipient email address' });
    }

    const { sendTestEmail } = require('../services/emailService');
    const result = await sendTestEmail(email.trim());

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Test payslip successfully sent to ${email}`,
        previewUrl: result.previewUrl || null,
        messageId: result.messageId || null
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to deliver test email: ${result.error}`,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/payruns/:id
exports.deletePayrun = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const payrunId = req.params.id;

    await connection.execute('DELETE FROM payroll_warnings WHERE payrun_id = ?', [payrunId]);
    const [slips] = await connection.execute('SELECT id FROM payslips WHERE payrun_id = ?', [payrunId]);
    for (const slip of slips) {
      await connection.execute('DELETE FROM payslip_lines WHERE payslip_id = ?', [slip.id]);
    }
    await connection.execute('DELETE FROM payslips WHERE payrun_id = ?', [payrunId]);
    await connection.execute('DELETE FROM payruns WHERE id = ?', [payrunId]);

    await connection.commit();
    res.status(200).json({ success: true, message: 'Payrun batch deleted successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};


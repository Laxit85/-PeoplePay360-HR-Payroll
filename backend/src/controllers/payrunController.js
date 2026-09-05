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
    const salary_structure_id = req.query.salary_structure_id || req.query.salaryStructureId;
    const period_start = req.query.period_start || req.query.periodStart;
    const period_end = req.query.period_end || req.query.periodEnd;

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

    const period_start = req.body.period_start || req.body.periodStart;
    const period_end = req.body.period_end || req.body.periodEnd;
    const salary_structure_id = req.body.salary_structure_id || req.body.salaryStructureId;
    const selected_employee_ids = req.body.selected_employee_ids || req.body.selectedEmployeeIds;
    const name = req.body.name || `Pay Run (${period_start} to ${period_end})`;

    if (!selected_employee_ids || !Array.isArray(selected_employee_ids) || selected_employee_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one employee' });
    }

    // 1. Create Payrun in DRAFT status
    const [result] = await connection.execute(
      `INSERT INTO payruns (name, period_start, period_end, salary_structure_id, status, total_employees, created_by_user_id) 
       VALUES (?, ?, ?, ?, 'DRAFT', ?, ?)`,
      [name, period_start, period_end, salary_structure_id, selected_employee_ids.length, req.user?.id || null]
    );

    const payrunId = result.insertId;

    // 2. Initialize draft payslips for selected employees
    for (const empId of selected_employee_ids) {
      const activeContract = await resolveActiveContract(empId, period_start, period_end);
      if (activeContract) {
        await connection.execute(
          `INSERT INTO payslips (payrun_id, employee_id, contract_id, period_start, period_end, status) 
           VALUES (?, ?, ?, ?, ?, 'DRAFT')`,
          [payrunId, empId, activeContract.id, period_start, period_end]
        );
      }
    }

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Payrun batch created successfully',
      data: { id: payrunId, name, period_start, period_end, total_employees: selected_employee_ids.length }
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
        jp.title AS job_position_title,
        c.wage AS contract_wage,
        c.reference_name AS contract_reference
       FROM payslips ps
       JOIN employees e ON ps.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN job_positions jp ON e.job_position_id = jp.id
       JOIN contracts c ON ps.contract_id = c.id
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

    // Format payslips for frontend compatibility
    const formattedPayslips = payslips.map((ps) => {
      const empWarnings = warnings
        .filter((w) => w.payslip_id === ps.id || w.employee_id === ps.employee_id)
        .map((w) => w.message || `${w.warning_type}: Warning for employee`);

      return {
        ...ps,
        id: ps.id,
        employeeId: ps.employee_id,
        employeeCode: ps.employee_code,
        employeeName: `${ps.first_name} ${ps.last_name}`,
        department: ps.department_name || 'General',
        jobPosition: ps.job_position_title || 'Staff',
        contractWage: parseFloat(ps.contract_wage || 0),
        workedDays: parseFloat(ps.worked_days || 0),
        scheduledWorkDays: parseFloat(ps.scheduled_work_days || 0),
        unpaidLeaveDays: parseFloat(ps.unpaid_leave_days || 0),
        basic: parseFloat(ps.contract_wage || 0),
        gross: parseFloat(ps.gross_salary || 0),
        net: parseFloat(ps.net_salary || 0),
        totalDeductions: parseFloat(ps.total_deductions || 0),
        status: ps.status,
        warnings: empWarnings
      };
    });

    const formattedPayrun = {
      ...payrun,
      id: payrun.id,
      name: payrun.name,
      periodStart: payrun.period_start,
      periodEnd: payrun.period_end,
      salaryStructureId: payrun.salary_structure_id,
      salaryStructureName: payrun.salary_structure_name,
      status: payrun.status,
      totalEmployees: payrun.total_employees || formattedPayslips.length,
      totalGross: parseFloat(payrun.total_gross || 0),
      totalDeductions: parseFloat(payrun.total_deductions || 0),
      totalNet: parseFloat(payrun.total_net || 0),
      warningsCount: payrun.warnings_count,
      payslips: formattedPayslips,
      warnings
    };

    res.status(200).json({
      success: true,
      data: formattedPayrun,
      payrun: formattedPayrun,
      payslips: formattedPayslips,
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

    if (payrun.status === 'VALIDATED' || payrun.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Cannot recompute a finalized or paid payrun' });
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
      const activeContract = await resolveActiveContract(slip.employee_id, payrun.period_start, payrun.period_end);

      if (!activeContract) {
        warningCount++;
        await connection.execute(
          `INSERT INTO payroll_warnings (payrun_id, payslip_id, employee_id, warning_type, severity, message) 
           VALUES (?, ?, ?, 'NO_ACTIVE_CONTRACT', 'CRITICAL', ?)`,
          [payrunId, slip.id, slip.employee_id, `Employee ${slip.employee_code} has no active contract valid for this period.`]
        );
        continue;
      }

      // Compute attendance worked days and unpaid leaves
      const { scheduledWorkDays, workedDays, unpaidLeaveDays } = await computeAttendanceAndLeaves(
        slip.employee_id,
        payrun.period_start,
        payrun.period_end
      );

      // Evaluate sequenced salary rules
      const { lines, grossSalary, totalDeductions, netSalary } = evaluateSalaryRules(
        rules,
        activeContract.wage,
        scheduledWorkDays,
        workedDays,
        unpaidLeaveDays
      );

      // Scan warnings
      const warnings = await scanWarnings(
        { ...slip, id: slip.employee_id, employee_id: slip.employee_id },
        activeContract,
        netSalary,
        payrunId,
        payrun.period_start,
        payrun.period_end
      );

      for (const w of warnings) {
        warningCount++;
        await connection.execute(
          `INSERT INTO payroll_warnings (payrun_id, payslip_id, employee_id, warning_type, severity, message) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [payrunId, slip.id, w.employee_id || slip.employee_id, w.warning_type, w.severity, w.message]
        );
      }

      // Update payslip record
      await connection.execute(
        `UPDATE payslips SET
          contract_id = ?,
          scheduled_work_days = ?,
          worked_days = ?,
          unpaid_leave_days = ?,
          gross_salary = ?,
          total_deductions = ?,
          net_salary = ?,
          status = 'COMPUTED'
         WHERE id = ?`,
        [
          activeContract.id,
          scheduledWorkDays,
          workedDays,
          unpaidLeaveDays,
          grossSalary,
          totalDeductions,
          netSalary,
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
            line.rule_code,
            line.rule_name,
            line.category,
            line.sequence,
            line.rate_or_percentage || null,
            line.amount
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

    if (payrun.status !== 'COMPUTED') {
      return res.status(400).json({ success: false, message: 'Payrun must be computed before it can be validated' });
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

    if (payrun.status !== 'VALIDATED') {
      return res.status(400).json({ success: false, message: 'Payrun must be validated before marking as paid' });
    }

    await pool.execute('UPDATE payruns SET status = "PAID", paid_at = NOW() WHERE id = ?', [payrunId]);
    await pool.execute('UPDATE payslips SET status = "PAID" WHERE payrun_id = ?', [payrunId]);

    res.status(200).json({ success: true, message: 'Payrun marked as PAID successfully' });
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

    const [[employee]] = await pool.execute('SELECT * FROM employees WHERE id = ?', [payslip.employee_id]);
    const [[contract]] = await pool.execute('SELECT * FROM contracts WHERE id = ?', [payslip.contract_id]);
    const [[payrun]] = await pool.execute('SELECT * FROM payruns WHERE id = ?', [payslip.payrun_id]);
    const [lines] = await pool.execute('SELECT * FROM payslip_lines WHERE payslip_id = ? ORDER BY sequence ASC', [payslipId]);

    const pdfBuffer = await generatePayslipPDF(payslip, lines, employee, contract, payrun);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Payslip_${employee.employee_code}.pdf"`);
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
      `SELECT ps.*, e.employee_code, e.first_name, e.last_name, e.email 
       FROM payslips ps 
       JOIN employees e ON ps.employee_id = e.id 
       WHERE ps.payrun_id = ?`,
      [payrunId]
    );

    let sentCount = 0;
    let failedCount = 0;
    const deliveryResults = [];

    for (const slip of payslips) {
      if (!slip.email) {
        failedCount++;
        deliveryResults.push({ employee_code: slip.employee_code, status: 'FAILED', reason: 'No email address' });
        continue;
      }

      try {
        const [[contract]] = await pool.execute('SELECT * FROM contracts WHERE id = ?', [slip.contract_id]);
        const [lines] = await pool.execute('SELECT * FROM payslip_lines WHERE payslip_id = ? ORDER BY sequence ASC', [slip.id]);

        const pdfBuffer = await generatePayslipPDF(slip, lines, slip, contract, payrun);
        const result = await sendPayslipEmail(
          slip.email,
          `${slip.first_name} ${slip.last_name}`,
          payrun.name,
          pdfBuffer
        );

        if (result.success) {
          sentCount++;
          await pool.execute('UPDATE payslips SET delivery_status = "SENT", sent_at = NOW() WHERE id = ?', [slip.id]);
          deliveryResults.push({ employee_code: slip.employee_code, status: 'SENT', previewUrl: result.previewUrl });
        } else {
          failedCount++;
          await pool.execute('UPDATE payslips SET delivery_status = "FAILED" WHERE id = ?', [slip.id]);
          deliveryResults.push({ employee_code: slip.employee_code, status: 'FAILED', error: result.error });
        }
      } catch (err) {
        failedCount++;
        deliveryResults.push({ employee_code: slip.employee_code, status: 'FAILED', error: err.message });
      }
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

// GET /api/payruns/payslips/:id (and /api/payslips/:id)
exports.getPayslipById = async (req, res) => {
  try {
    const payslipId = req.params.id;
    const [payslips] = await pool.execute(
      `SELECT 
        ps.*,
        e.id AS emp_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.user_id,
        d.name AS department_name,
        jp.title AS job_position_title,
        c.wage AS contract_wage,
        c.reference_name AS contract_reference,
        p.name AS payrun_name
       FROM payslips ps
       JOIN employees e ON ps.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN job_positions jp ON e.job_position_id = jp.id
       JOIN contracts c ON ps.contract_id = c.id
       JOIN payruns p ON ps.payrun_id = p.id
       WHERE ps.id = ?`,
      [payslipId]
    );

    if (payslips.length === 0) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const ps = payslips[0];

    // RBAC: If EMPLOYEE role, can only view own payslip
    if (req.user?.role === 'EMPLOYEE' && ps.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own payslips' });
    }

    const [lines] = await pool.execute(
      'SELECT * FROM payslip_lines WHERE payslip_id = ? ORDER BY sequence ASC',
      [payslipId]
    );

    // Calculate Basic & Allowances
    const basicLine = lines.find(l => l.category === 'BASIC' || l.rule_code === 'BASIC');
    const allowancesTotal = lines
      .filter(l => l.category === 'ALLOWANCE')
      .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

    const formatted = {
      id: ps.id,
      payrunId: ps.payrun_id,
      payrunName: ps.payrun_name,
      employeeId: ps.employee_id,
      employeeCode: ps.employee_code,
      employeeName: `${ps.first_name} ${ps.last_name}`,
      department: ps.department_name || 'General',
      jobPosition: ps.job_position_title || 'Staff',
      periodStart: ps.period_start,
      periodEnd: ps.period_end,
      scheduledWorkDays: parseFloat(ps.scheduled_work_days || 0),
      workedDays: parseFloat(ps.worked_days || 0),
      unpaidLeaveDays: parseFloat(ps.unpaid_leave_days || 0),
      basic: parseFloat(basicLine ? basicLine.amount : ps.contract_wage || 0),
      allowances: allowancesTotal,
      gross: parseFloat(ps.gross_salary || 0),
      deductions: parseFloat(ps.total_deductions || 0),
      net: parseFloat(ps.net_salary || 0),
      status: ps.status,
      deliveryStatus: ps.delivery_status,
      ruleLineItems: lines.map(l => ({
        id: l.id,
        code: l.rule_code,
        name: l.rule_name,
        category: l.category ? (l.category.charAt(0).toUpperCase() + l.category.slice(1).toLowerCase()) : 'Allowance',
        sequence: l.sequence,
        rateOrPercentage: l.rate_or_percentage,
        amount: parseFloat(l.amount || 0)
      }))
    };

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

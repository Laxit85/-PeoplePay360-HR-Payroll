const { pool } = require('../config/db');

// GET /api/dashboard
exports.getDashboardMetrics = async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      department_id,
      department,
      employee_id,
      employee_type,
      period,
    } = req.query;

    const now = new Date();
    const isAllPeriod = period === 'all' || period === 'ALL';
    let periodStart = start_date;
    let periodEnd = end_date;

    if (isAllPeriod) {
      periodStart = '2020-01-01';
      periodEnd = '2099-12-31';
    } else if (period && typeof period === 'string' && period.match(/^\d{4}-\d{2}$/)) {
      const [y, m] = period.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      periodStart = `${y}-${String(m).padStart(2, '0')}-01`;
      periodEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      if (!periodStart) {
        periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      }
      if (!periodEnd) {
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    // Normalizing filters
    const targetEmployeeId =
      employee_id && employee_id !== 'All' && employee_id !== 'all'
        ? Number(employee_id)
        : null;

    const targetDept =
      department_id && department_id !== 'All' && department_id !== 'all'
        ? department_id
        : department && department !== 'All' && department !== 'all'
        ? department
        : null;

    const targetType =
      employee_type && employee_type !== 'All' && employee_type !== 'all'
        ? employee_type.toUpperCase().replace('-', '_')
        : null;

    // 1. Fetch available filter options from the database
    const [deptRows] = await pool.execute(
      'SELECT id, name, code FROM departments ORDER BY name ASC'
    );

    const [empRows] = await pool.execute(`
      SELECT 
        e.id, 
        e.employee_code, 
        e.first_name, 
        e.last_name, 
        e.department_id, 
        e.employee_type,
        d.name AS department_name, 
        COALESCE(c.wage, 0) AS contract_wage
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN contracts c ON c.id = (
        SELECT id FROM contracts WHERE employee_id = e.id AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1
      )
      ORDER BY e.first_name ASC
    `);

    // Dynamic list of available payrun periods from DB
    const [periodRows] = await pool.execute(`
      SELECT DISTINCT 
        DATE_FORMAT(period_start, '%Y-%m') AS period_code,
        DATE_FORMAT(period_start, '%M %Y') AS period_label
      FROM payruns
      ORDER BY period_code DESC
    `);

    // 2. Build WHERE clauses for employee filtering
    const empWhereClauses = ['1=1'];
    const empWhereParams = [];

    if (targetEmployeeId) {
      empWhereClauses.push('e.id = ?');
      empWhereParams.push(targetEmployeeId);
    }
    if (targetDept) {
      empWhereClauses.push('(e.department_id = ? OR d.name = ? OR d.code = ?)');
      empWhereParams.push(targetDept, targetDept, targetDept);
    }
    if (targetType) {
      empWhereClauses.push('e.employee_type = ?');
      empWhereParams.push(targetType);
    }
    const empWhereStr = empWhereClauses.join(' AND ');

    // 3. Query Salary Database Stats (Headcount & Contract Wage)
    const [[salaryDbStats]] = await pool.execute(
      `SELECT 
        COUNT(e.id) AS matching_headcount,
        COALESCE(SUM(c.wage), 0) AS total_contract_base_wage,
        COALESCE(AVG(c.wage), 0) AS avg_contract_wage
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN contracts c ON c.id = (
         SELECT id FROM contracts WHERE employee_id = e.id AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1
       )
       WHERE ${empWhereStr}`,
      empWhereParams
    );

    // 4. Query Payslip Disbursements matching the filters
    const psWhereClauses = ['ps.period_start <= ?', 'ps.period_end >= ?'];
    const psWhereParams = [periodEnd, periodStart];

    if (targetEmployeeId) {
      psWhereClauses.push('e.id = ?');
      psWhereParams.push(targetEmployeeId);
    }
    if (targetDept) {
      psWhereClauses.push('(e.department_id = ? OR d.name = ? OR d.code = ?)');
      psWhereParams.push(targetDept, targetDept, targetDept);
    }
    if (targetType) {
      psWhereClauses.push('e.employee_type = ?');
      psWhereParams.push(targetType);
    }
    const psWhereStr = psWhereClauses.join(' AND ');

    const [[kpiResults]] = await pool.execute(
      `SELECT 
        COALESCE(SUM(ps.net_salary), 0) AS total_net_paid,
        COALESCE(SUM(ps.gross_salary), 0) AS total_gross,
        COALESCE(SUM(ps.total_deductions), 0) AS total_deductions,
        COUNT(ps.id) AS payslips_generated,
        COUNT(DISTINCT ps.employee_id) AS total_employees_paid
       FROM payslips ps
       JOIN employees e ON ps.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ${psWhereStr}`,
      psWhereParams
    );

    const totalNetPaid = parseFloat(kpiResults.total_net_paid || 0);
    const totalGross = parseFloat(kpiResults.total_gross || 0);
    const totalDeductions = parseFloat(kpiResults.total_deductions || 0);
    const payslipsGenerated = parseInt(kpiResults.payslips_generated || 0, 10);
    const totalEmployeesPaid = parseInt(kpiResults.total_employees_paid || 0, 10);
    const matchingHeadcount = parseInt(salaryDbStats.matching_headcount || 0, 10);
    const totalContractBaseWage = parseFloat(salaryDbStats.total_contract_base_wage || 0);
    const avgContractWage = parseFloat(salaryDbStats.avg_contract_wage || 0);

    const averageSalary =
      payslipsGenerated > 0
        ? Math.round(totalNetPaid / payslipsGenerated)
        : Math.round(avgContractWage);

    // 5. Attendance Health % (Filtered)
    const attWhereClauses = ['a.attendance_date BETWEEN ? AND ?'];
    const attWhereParams = [periodStart, periodEnd];

    if (targetEmployeeId) {
      attWhereClauses.push('a.employee_id = ?');
      attWhereParams.push(targetEmployeeId);
    }
    if (targetDept) {
      attWhereClauses.push('(e.department_id = ? OR d.name = ?)');
      attWhereParams.push(targetDept, targetDept);
    }
    if (targetType) {
      attWhereClauses.push('e.employee_type = ?');
      attWhereParams.push(targetType);
    }

    const [[attStats]] = await pool.execute(
      `SELECT 
        COUNT(*) AS total_records,
        COUNT(CASE WHEN a.status = 'ON_TIME' THEN 1 END) AS on_time_records
       FROM attendances a
       JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ${attWhereClauses.join(' AND ')}`,
      attWhereParams
    );

    const attendanceHealth =
      attStats.total_records > 0
        ? Math.round((attStats.on_time_records / attStats.total_records) * 100)
        : 100;

    // 6. Approved Time Off Days (Filtered)
    const leaveWhereClauses = ['tor.date_from <= ?', 'tor.date_to >= ?', 'tor.status = "APPROVED"'];
    const leaveWhereParams = [periodEnd, periodStart];

    if (targetEmployeeId) {
      leaveWhereClauses.push('tor.employee_id = ?');
      leaveWhereParams.push(targetEmployeeId);
    }
    if (targetDept) {
      leaveWhereClauses.push('(e.department_id = ? OR d.name = ?)');
      leaveWhereParams.push(targetDept, targetDept);
    }
    if (targetType) {
      leaveWhereClauses.push('e.employee_type = ?');
      leaveWhereParams.push(targetType);
    }

    const [[leaveStats]] = await pool.execute(
      `SELECT COALESCE(SUM(tor.duration), 0) AS approved_days
       FROM time_off_requests tor
       JOIN employees e ON tor.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ${leaveWhereClauses.join(' AND ')}`,
      leaveWhereParams
    );
    const approvedTimeOffDays = parseFloat(leaveStats.approved_days || 0);

    // Pending requests
    const pendingWhereClauses = ['tor.status = "SUBMITTED"'];
    const pendingWhereParams = [];
    if (targetEmployeeId) {
      pendingWhereClauses.push('tor.employee_id = ?');
      pendingWhereParams.push(targetEmployeeId);
    }
    const [[pendingStats]] = await pool.execute(
      `SELECT COUNT(*) AS pending_requests FROM time_off_requests tor WHERE ${pendingWhereClauses.join(' AND ')}`,
      pendingWhereParams
    );

    // 7. Operational Alerts
    const warnWhereClauses = ['pw.is_resolved = 0'];
    const warnWhereParams = [];
    if (targetEmployeeId) {
      warnWhereClauses.push('pw.employee_id = ?');
      warnWhereParams.push(targetEmployeeId);
    }
    const [[alertStats]] = await pool.execute(
      `SELECT COUNT(*) AS unresolved_warnings FROM payroll_warnings pw WHERE ${warnWhereClauses.join(' AND ')}`,
      warnWhereParams
    );

    // Expiring contracts
    const [[expiringStats]] = await pool.execute(
      `SELECT COUNT(*) AS expiring_contracts 
       FROM contracts c
       JOIN employees e ON c.employee_id = e.id
       WHERE c.status = 'ACTIVE' AND c.end_date IS NOT NULL 
         AND c.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         ${targetEmployeeId ? 'AND e.id = ' + pool.escape(targetEmployeeId) : ''}`
    );

    // 8. All Employee Payments & Salary Database Records
    // Joining employees with their active contract salary from the database AND period payslips
    const employeePaymentsSql = `
      SELECT 
        e.id AS employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.employee_type,
        d.name AS department_name,
        jp.title AS job_position_title,
        COALESCE(c.wage, 0) AS contract_wage,
        c.wage_type,
        c.status AS contract_status,
        ps.id AS payslip_id,
        ps.payrun_id,
        ps.period_start,
        ps.period_end,
        COALESCE(ps.status, 'ACTIVE_CONTRACT') AS status,
        COALESCE(ps.worked_days, 0) AS worked_days,
        COALESCE(ps.gross_salary, 0) AS gross_salary,
        COALESCE(ps.total_deductions, 0) AS total_deductions,
        COALESCE(ps.net_salary, 0) AS net_salary,
        ps.delivery_status,
        ps.sent_at,
        ps.created_at,
        COALESCE(pr.name, 'Pending Pay Run') AS payrun_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN contracts c ON c.id = (
        SELECT id FROM contracts WHERE employee_id = e.id AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1
      )
      LEFT JOIN payslips ps ON ps.employee_id = e.id AND ps.period_start <= ? AND ps.period_end >= ?
      LEFT JOIN payruns pr ON ps.payrun_id = pr.id
      WHERE ${empWhereStr}
      ORDER BY 
        (ps.id IS NOT NULL) DESC,
        ps.net_salary DESC,
        c.wage DESC,
        e.first_name ASC
    `;

    const [employeePayments] = await pool.execute(
      employeePaymentsSql,
      [periodEnd, periodStart, ...empWhereParams]
    );

    // 9. Department Cost Chart Data
    const [departmentCosts] = await pool.execute(
      `SELECT 
        d.name AS department_name,
        d.code AS department_code,
        COUNT(DISTINCT e.id) AS headcount,
        COALESCE(SUM(ps.gross_salary), 0) AS gross_cost,
        COALESCE(SUM(ps.net_salary), 0) AS net_cost
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id AND e.employment_status = 'ACTIVE'
       LEFT JOIN payslips ps ON e.id = ps.employee_id AND ps.period_start <= ? AND ps.period_end >= ?
       GROUP BY d.id, d.name, d.code
       ORDER BY gross_cost DESC`,
      [periodEnd, periodStart]
    );

    // 10. Monthly Trends (Last 6 Payruns)
    const [monthlyTrends] = await pool.execute(
      `SELECT id, name, period_start, period_end, total_gross, total_net, status 
       FROM payruns 
       WHERE status IN ('COMPUTED', 'VALIDATED', 'PAID')
       ORDER BY period_start ASC 
       LIMIT 6`
    );

    // Find selected employee details if an employee is specifically chosen
    let selectedEmployee = null;
    if (targetEmployeeId) {
      const matched = empRows.find((e) => e.id === targetEmployeeId);
      if (matched) {
        selectedEmployee = {
          id: matched.id,
          name: `${matched.first_name} ${matched.last_name}`,
          code: matched.employee_code,
          department: matched.department_name,
          wage: matched.contract_wage,
          type: matched.employee_type,
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalNetPaid,
          totalGross,
          totalDeductions,
          payslipsGenerated,
          totalEmployeesPaid,
          matchingHeadcount,
          totalContractBaseWage,
          averageSalary,
          attendanceHealth,
          approvedTimeOffDays,
          pendingTimeOffRequests: pendingStats.pending_requests,
          unresolvedWarnings: alertStats.unresolved_warnings,
          expiringContractsCount: expiringStats.expiring_contracts,
        },
        selectedEmployee,
        employeePayments,
        departmentCosts,
        monthlyTrends,
        filterOptions: {
          departments: deptRows,
          employees: empRows.map((e) => ({
            id: e.id,
            name: `${e.first_name} ${e.last_name}`,
            code: e.employee_code,
            department_id: e.department_id,
            department_name: e.department_name,
            contract_wage: e.contract_wage,
          })),
          periods: periodRows,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

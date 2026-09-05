const { pool } = require('../config/db');

// GET /api/dashboard
exports.getDashboardMetrics = async (req, res) => {
  try {
    const { start_date, end_date, department_id, employee_type } = req.query;

    const now = new Date();
    const periodStart = start_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const periodEnd = end_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-28`;

    // 1. KPI Cards
    // Total Net Disbursed (Paid)
    let netQuery = `
      SELECT 
        COALESCE(SUM(ps.net_salary), 0) AS total_net_paid,
        COALESCE(SUM(ps.gross_salary), 0) AS total_gross,
        COUNT(ps.id) AS payslips_generated
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      WHERE ps.period_start >= ? AND ps.period_end <= ?
    `;
    const netParams = [periodStart, periodEnd];

    if (department_id) {
      netQuery += ' AND e.department_id = ?';
      netParams.push(department_id);
    }
    if (employee_type) {
      netQuery += ' AND e.employee_type = ?';
      netParams.push(employee_type);
    }

    const [[kpiResults]] = await pool.execute(netQuery, netParams);

    const totalNetPaid = parseFloat(kpiResults.total_net_paid || 0);
    const totalGross = parseFloat(kpiResults.total_gross || 0);
    const payslipsGenerated = parseInt(kpiResults.payslips_generated || 0, 10);
    const averageSalary = payslipsGenerated > 0 ? Math.round(totalGross / payslipsGenerated) : 0;

    // 2. Attendance Health %
    const [[attStats]] = await pool.execute(
      `SELECT 
        COUNT(*) AS total_records,
        COUNT(CASE WHEN status = 'ON_TIME' THEN 1 END) AS on_time_records
       FROM attendances 
       WHERE attendance_date BETWEEN ? AND ?`,
      [periodStart, periodEnd]
    );
    const attendanceHealth = attStats.total_records > 0
      ? Math.round((attStats.on_time_records / attStats.total_records) * 100)
      : 100;

    // 3. Approved Time Off Days
    const [[leaveStats]] = await pool.execute(
      `SELECT 
        COALESCE(SUM(duration), 0) AS approved_days,
        COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END) AS pending_requests
       FROM time_off_requests 
       WHERE date_from <= ? AND date_to >= ? AND status = 'APPROVED'`,
      [periodEnd, periodStart]
    );
    const approvedTimeOffDays = parseFloat(leaveStats.approved_days || 0);

    const [[pendingStats]] = await pool.execute(
      'SELECT COUNT(*) AS pending_requests FROM time_off_requests WHERE status = "SUBMITTED"'
    );

    // 4. Salary Cost by Department (Chart Data)
    const [departmentCosts] = await pool.execute(
      `SELECT 
        d.name AS department_name,
        d.code AS department_code,
        COUNT(DISTINCT e.id) AS headcount,
        COALESCE(SUM(ps.gross_salary), 0) AS gross_cost,
        COALESCE(SUM(ps.net_salary), 0) AS net_cost
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id AND e.employment_status = 'ACTIVE'
       LEFT JOIN payslips ps ON e.id = ps.employee_id AND ps.period_start >= ? AND ps.period_end <= ?
       GROUP BY d.id, d.name, d.code
       ORDER BY gross_cost DESC`,
      [periodStart, periodEnd]
    );

    // 5. Monthly Net Salary Trends (Last 6 payruns)
    const [monthlyTrends] = await pool.execute(
      `SELECT id, name, period_start, period_end, total_gross, total_net, status 
       FROM payruns 
       WHERE status IN ('COMPUTED', 'VALIDATED', 'PAID')
       ORDER BY period_start ASC 
       LIMIT 6`
    );

    // 6. Operational Alerts
    const [[alertStats]] = await pool.execute(
      'SELECT COUNT(*) AS unresolved_warnings FROM payroll_warnings WHERE is_resolved = 0'
    );

    // Expiring contracts within next 30 days
    const [[expiringStats]] = await pool.execute(
      `SELECT COUNT(*) AS expiring_contracts 
       FROM contracts 
       WHERE status = 'ACTIVE' AND end_date IS NOT NULL 
         AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
    );

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalNetPaid,
          totalGross,
          payslipsGenerated,
          averageSalary,
          attendanceHealth,
          approvedTimeOffDays,
          pendingTimeOffRequests: pendingStats.pending_requests,
          unresolvedWarnings: alertStats.unresolved_warnings,
          expiringContractsCount: expiringStats.expiring_contracts
        },
        departmentCosts,
        monthlyTrends
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

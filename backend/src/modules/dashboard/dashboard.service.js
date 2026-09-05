// src/modules/dashboard/dashboard.service.js
// Owner: Everyone (last module, split-friendly)
// Read-only aggregation layer. No writes, no new tables — just queries
// across employees/attendances/time_off_requests/payslips.

const pool = require('../../db/pool');

function buildFilters({ department, employeeType }) {
  const conditions = [];
  const params = {};
  if (department) {
    conditions.push('e.department = :department');
    params.department = department;
  }
  if (employeeType) {
    conditions.push('e.status = :employeeType');
    params.employeeType = employeeType;
  }
  return { conditions, params };
}

async function headcountKpis(filters) {
  const { conditions, params } = buildFilters(filters);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM employees e ${where} GROUP BY status`,
    params
  );
  return rows;
}

async function attendanceExceptionsChart({ periodStart, periodEnd, ...filters }) {
  const { conditions, params } = buildFilters(filters);
  conditions.push('a.work_date BETWEEN :periodStart AND :periodEnd');
  params.periodStart = periodStart;
  params.periodEnd = periodEnd;

  const [rows] = await pool.query(
    `SELECT a.status, COUNT(*) AS count
     FROM attendances a
     JOIN employees e ON e.id = a.employee_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY a.status`,
    params
  );
  return rows;
}

async function payrollCostChart({ periodStart, periodEnd }) {
  const [rows] = await pool.query(
    `SELECT pr.period_start, pr.period_end, SUM(ps.net_pay) AS total_net_pay
     FROM payruns pr
     JOIN payslips ps ON ps.payrun_id = pr.id
     WHERE pr.period_start >= :periodStart AND pr.period_end <= :periodEnd
     GROUP BY pr.id
     ORDER BY pr.period_start`,
    { periodStart, periodEnd }
  );
  return rows;
}

async function leaveUsageChart({ periodStart, periodEnd, ...filters }) {
  const { conditions, params } = buildFilters(filters);
  conditions.push("r.status = 'approved'");
  conditions.push('r.start_date <= :periodEnd');
  conditions.push('r.end_date >= :periodStart');
  params.periodStart = periodStart;
  params.periodEnd = periodEnd;

  const [rows] = await pool.query(
    `SELECT t.name AS type_name, COUNT(*) AS request_count
     FROM time_off_requests r
     JOIN time_off_types t ON t.id = r.time_off_type_id
     JOIN employees e ON e.id = r.employee_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY t.name`,
    params
  );
  return rows;
}

module.exports = { headcountKpis, attendanceExceptionsChart, payrollCostChart, leaveUsageChart };

// src/modules/attendance/attendance.service.js
// Owner: Person 3
// ⭐ SHARED — Person 4 (Payroll) calls this directly.

const pool = require('../../db/pool');

/**
 * getWorkedDays(employeeId, periodStart, periodEnd)
 * → { workedDays, totalHours, records }
 */
async function getWorkedDays(employeeId, periodStart, periodEnd) {
  const [rows] = await pool.query(
    `SELECT * FROM attendances
     WHERE employee_id = :employeeId
       AND work_date BETWEEN :periodStart AND :periodEnd
       AND status != 'missing_checkout'`,
    { employeeId, periodStart, periodEnd }
  );

  const workedDays = rows.length;
  const totalHours = rows.reduce((sum, r) => {
    if (!r.check_in || !r.check_out) return sum;
    return sum + (new Date(r.check_out) - new Date(r.check_in)) / 3600000;
  }, 0);

  return { workedDays, totalHours, records: rows };
}

module.exports = { getWorkedDays };

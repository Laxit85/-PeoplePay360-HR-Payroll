// src/modules/timeoff/leaveBalance.service.js
// Owner: Person 3
// ⭐ SHARED — Person 4 (Payroll) calls this directly.

const pool = require('../../db/pool');

/**
 * getApprovedLeave(employeeId, periodStart, periodEnd)
 * → { unpaidDays, paidDays, requests }
 */
async function getApprovedLeave(employeeId, periodStart, periodEnd) {
  const [rows] = await pool.query(
    `SELECT r.*, t.is_paid
     FROM time_off_requests r
     JOIN time_off_types t ON t.id = r.time_off_type_id
     WHERE r.employee_id = :employeeId
       AND r.status = 'approved'
       AND r.start_date <= :periodEnd
       AND r.end_date >= :periodStart`,
    { employeeId, periodStart, periodEnd }
  );

  let unpaidDays = 0;
  let paidDays = 0;
  rows.forEach((r) => {
    const days = Math.round((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1;
    if (r.is_paid) paidDays += days;
    else unpaidDays += days;
  });

  return { unpaidDays, paidDays, requests: rows };
}

module.exports = { getApprovedLeave };

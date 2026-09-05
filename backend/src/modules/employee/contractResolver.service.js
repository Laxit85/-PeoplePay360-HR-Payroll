// src/modules/employee/contractResolver.service.js
// Owner: Person 2
// ⭐ SHARED — Person 4 (Payroll) calls this directly. Do not change this
// signature without posting in the group chat first.

const pool = require('../../db/pool');

/**
 * resolveContractForPeriod(employeeId, periodStart, periodEnd)
 * → returns the single Contract row overlapping that period
 * → throws a 404-flavored error if none found
 * → throws a 409-flavored error if more than one found (data integrity bug)
 */
async function resolveContractForPeriod(employeeId, periodStart, periodEnd) {
  const [rows] = await pool.query(
    `SELECT * FROM contracts
     WHERE employee_id = :employeeId
       AND is_active = TRUE
       AND (end_date IS NULL OR end_date >= :periodStart)
       AND start_date <= :periodEnd`,
    { employeeId, periodStart, periodEnd }
  );

  if (rows.length === 0) {
    const err = new Error(`No active contract found for employee ${employeeId} in given period`);
    err.status = 404;
    throw err;
  }
  if (rows.length > 1) {
    const err = new Error(`Multiple overlapping contracts found for employee ${employeeId} — data integrity issue`);
    err.status = 409;
    throw err;
  }
  return rows[0];
}

module.exports = { resolveContractForPeriod };

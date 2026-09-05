// src/modules/employee/contract.controller.js
// Owner: Person 2
// Enforces: an employee can never have two ACTIVE contracts with overlapping dates.

const pool = require('../../db/pool');

async function findOverlapping(connection, { employeeId, startDate, endDate, excludeId = null }) {
  const params = { employeeId, startDate, endDate: endDate || '9999-12-31' };
  let sql = `
    SELECT id FROM contracts
    WHERE employee_id = :employeeId
      AND is_active = TRUE
      AND (end_date IS NULL OR end_date >= :startDate)
      AND start_date <= :endDate
  `;
  if (excludeId) {
    sql += ' AND id != :excludeId';
    params.excludeId = excludeId;
  }
  const [rows] = await connection.query(sql, params);
  return rows;
}

async function list(req, res, next) {
  try {
    const { employeeId } = req.query;
    const params = {};
    let sql = 'SELECT * FROM contracts';
    if (employeeId) {
      sql += ' WHERE employee_id = :employeeId';
      params.employeeId = employeeId;
    }
    const [rows] = await pool.query(sql, params);
    res.json({ contracts: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { employeeId, startDate, endDate, wage, salaryStructureId } = req.body;

    await connection.beginTransaction();

    const overlaps = await findOverlapping(connection, { employeeId, startDate, endDate });
    if (overlaps.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Overlapping active contract exists for this employee' });
    }

    const [result] = await connection.query(
      `INSERT INTO contracts (employee_id, start_date, end_date, wage, salary_structure_id, is_active)
       VALUES (:employeeId, :startDate, :endDate, :wage, :salaryStructureId, TRUE)`,
      { employeeId, startDate, endDate: endDate || null, wage, salaryStructureId }
    );

    await connection.commit();
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

module.exports = { list, create, findOverlapping };

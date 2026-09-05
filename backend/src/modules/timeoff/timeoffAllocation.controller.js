// src/modules/timeoff/timeoffAllocation.controller.js
// Owner: Person 3

const pool = require('../../db/pool');

async function getByEmployee(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, t.name AS type_name FROM time_off_allocations a
       JOIN time_off_types t ON t.id = a.time_off_type_id
       WHERE a.employee_id = :employeeId`,
      { employeeId: req.params.employeeId }
    );
    res.json({ allocations: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { employeeId, timeOffTypeId, allocatedDays } = req.body;
    const [result] = await pool.query(
      `INSERT INTO time_off_allocations (employee_id, time_off_type_id, allocated_days, remaining_days)
       VALUES (:employeeId, :timeOffTypeId, :allocatedDays, :allocatedDays)`,
      { employeeId, timeOffTypeId, allocatedDays }
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getByEmployee, create };

// src/modules/employee/employee.controller.js
// Owner: Person 2

const pool = require('../../db/pool');

async function list(req, res, next) {
  try {
    const { status, department } = req.query;
    const conditions = [];
    const params = {};

    if (status) {
      conditions.push('status = :status');
      params.status = status;
    }
    if (department) {
      conditions.push('department = :department');
      params.department = department;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT * FROM employees ${where} ORDER BY id`, params);
    res.json({ employees: rows });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = :id', { id: req.params.id });
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
    res.json({ employee: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { fullName, department, status = 'active' } = req.body;
    const [result] = await pool.query(
      'INSERT INTO employees (full_name, department, status) VALUES (:fullName, :department, :status)',
      { fullName, department, status }
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { fullName, department, status } = req.body;
    await pool.query(
      `UPDATE employees SET full_name = :fullName, department = :department, status = :status
       WHERE id = :id`,
      { id: req.params.id, fullName, department, status }
    );
    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update };

// src/modules/payroll/salaryRule.controller.js
// Owner: Person 4

const pool = require('../../config/db');

async function list(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM salary_rules ORDER BY sequence');
    res.json({ rules: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { code, label, formula, sequence = 10 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO salary_rules (code, label, formula, sequence) VALUES (:code, :label, :formula, :sequence)',
      { code, label, formula, sequence }
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create };

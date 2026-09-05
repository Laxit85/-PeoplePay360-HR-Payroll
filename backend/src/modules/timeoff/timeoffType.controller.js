// src/modules/timeoff/timeoffType.controller.js
// Owner: Person 3

const pool = require('../../config/db');

async function list(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM time_off_types');
    res.json({ types: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, isPaid = true } = req.body;
    const [result] = await pool.query(
      'INSERT INTO time_off_types (name, is_paid) VALUES (:name, :isPaid)',
      { name, isPaid }
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create };

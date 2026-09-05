// src/modules/payroll/salaryStructure.controller.js
// Owner: Person 4

const pool = require('../../config/db');

async function list(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM salary_structures');
    res.json({ structures: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, ruleIds = [] } = req.body; // ruleIds: ordered array of salary_rule ids
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        'INSERT INTO salary_structures (name) VALUES (:name)',
        { name }
      );
      const structureId = result.insertId;

      for (let i = 0; i < ruleIds.length; i++) {
        await connection.query(
          `INSERT INTO salary_structure_rules (salary_structure_id, salary_rule_id, sequence)
           VALUES (:structureId, :ruleId, :sequence)`,
          { structureId, ruleId: ruleIds[i], sequence: i + 1 }
        );
      }
      await connection.commit();
      res.status(201).json({ id: structureId });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    next(err);
  }
}

async function getRules(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT sr.*, ssr.sequence AS structure_sequence
       FROM salary_structure_rules ssr
       JOIN salary_rules sr ON sr.id = ssr.salary_rule_id
       WHERE ssr.salary_structure_id = :structureId
       ORDER BY ssr.sequence`,
      { structureId: req.params.id }
    );
    res.json({ rules: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getRules };

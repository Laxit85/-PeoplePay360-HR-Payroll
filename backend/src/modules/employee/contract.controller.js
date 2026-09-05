// src/modules/employee/contract.controller.js
// Owner: Person 2
// Enforces: an employee can never have two ACTIVE contracts with overlapping dates.

const { pool } = require('../../config/db');

async function findOverlapping(connection, { employeeId, startDate, endDate, excludeId = null }) {
  const params = { employeeId, startDate, endDate: endDate || '9999-12-31' };
  let sql = `
    SELECT id FROM contracts
    WHERE employee_id = :employeeId
      AND status IN ('ACTIVE', 'Running')
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
    const rawEmpId = req.query.employeeId || req.query.employee_id;
    const params = {};
    let sql = `
      SELECT 
        c.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        d.name AS department_name,
        jp.title AS job_position_title,
        ss.name AS salary_structure_name,
        ss.code AS salary_structure_code
      FROM contracts c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN salary_structures ss ON c.salary_structure_id = ss.id
    `;
    if (rawEmpId) {
      const cleanEmpId = String(rawEmpId).replace(/^emp-/i, '');
      sql += ' WHERE (c.employee_id = :rawEmpId OR e.employee_code = :rawEmpId OR c.employee_id = :cleanEmpId)';
      params.rawEmpId = rawEmpId;
      params.cleanEmpId = cleanEmpId;
    }
    sql += ' ORDER BY c.start_date DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const {
      employee_id,
      employeeId,
      reference_name,
      referenceName,
      salary_structure_id,
      salaryStructureId,
      working_schedule_id,
      workingScheduleId,
      wage,
      wage_type,
      start_date,
      startDate,
      end_date,
      endDate,
      status
    } = req.body;

    const rawEmpId = employee_id || employeeId || 1;
    let targetEmployeeId = rawEmpId;
    if (typeof targetEmployeeId === 'string') {
      const cleanEmpId = targetEmployeeId.replace(/^emp-/i, '');
      const [foundEmp] = await connection.query(
        'SELECT id FROM employees WHERE id = :cleanEmpId OR employee_code = :targetEmployeeId LIMIT 1',
        { cleanEmpId, targetEmployeeId }
      );
      if (foundEmp.length > 0) {
        targetEmployeeId = foundEmp[0].id;
      } else if (!isNaN(cleanEmpId)) {
        targetEmployeeId = parseInt(cleanEmpId, 10);
      }
    }

    const sDate = start_date || startDate || '2026-01-01';
    const eDate = end_date || endDate || null;
    const normalizedStatus = (status === 'Running' || status === 'ACTIVE') ? 'ACTIVE' : (status || 'DRAFT');
    const targetStructId = salary_structure_id || salaryStructureId || 1;
    const targetScheduleId = working_schedule_id || workingScheduleId || null;
    const targetRefName = reference_name || referenceName || 'Employment Contract';

    await connection.beginTransaction();

    if (normalizedStatus === 'ACTIVE') {
      await connection.query(
        `UPDATE contracts SET status = 'EXPIRED' WHERE employee_id = :targetEmployeeId AND status IN ('ACTIVE', 'Running')`,
        { targetEmployeeId }
      );
    }

    const [result] = await connection.query(
      `INSERT INTO contracts (
        employee_id, reference_name, salary_structure_id, working_schedule_id,
        wage, wage_type, start_date, end_date, status
      ) VALUES (
        :targetEmployeeId, :targetRefName, :targetStructId, :targetScheduleId,
        :wage, :wageType, :sDate, :eDate, :normalizedStatus
      )`,
      {
        targetEmployeeId,
        targetRefName,
        targetStructId,
        targetScheduleId,
        wage: wage || 0,
        wageType: wage_type || 'MONTHLY',
        sDate,
        eDate: eDate || null,
        normalizedStatus
      }
    );

    await connection.commit();
    res.status(201).json({ success: true, id: result.insertId, message: 'Contract created successfully' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

module.exports = { list, create, findOverlapping };

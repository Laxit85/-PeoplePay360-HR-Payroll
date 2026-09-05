// src/modules/timeoff/timeoffRequest.controller.js
// Owner: Person 3
// Enforces: approving a request decrements the allocation's remaining_days,
// and a request can never be approved past the remaining balance.

const pool = require('../../config/db');

function countDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end - start) / 86400000) + 1;
}

async function create(req, res, next) {
  try {
    const { employeeId, timeOffTypeId, startDate, endDate } = req.body;
    const [result] = await pool.query(
      `INSERT INTO time_off_requests (employee_id, time_off_type_id, start_date, end_date, status)
       VALUES (:employeeId, :timeOffTypeId, :startDate, :endDate, 'pending')`,
      { employeeId, timeOffTypeId, startDate, endDate }
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [requestRows] = await connection.query(
      'SELECT * FROM time_off_requests WHERE id = :id FOR UPDATE',
      { id: req.params.id }
    );
    const request = requestRows[0];
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: `Request already ${request.status}` });
    }

    const days = countDays(request.start_date, request.end_date);

    // Lock the allocation row so two concurrent approvals can't both pass the check
    const [allocRows] = await connection.query(
      `SELECT * FROM time_off_allocations
       WHERE employee_id = :employeeId AND time_off_type_id = :typeId
       FOR UPDATE`,
      { employeeId: request.employee_id, typeId: request.time_off_type_id }
    );
    const allocation = allocRows[0];
    if (!allocation || Number(allocation.remaining_days) < days) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient leave balance' });
    }

    await connection.query(
      'UPDATE time_off_allocations SET remaining_days = remaining_days - :days WHERE id = :id',
      { days, id: allocation.id }
    );
    await connection.query(
      "UPDATE time_off_requests SET status = 'approved' WHERE id = :id",
      { id: request.id }
    );

    await connection.commit();
    res.json({ approved: true, daysDeducted: days });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function refuse(req, res, next) {
  try {
    await pool.query(
      "UPDATE time_off_requests SET status = 'refused' WHERE id = :id AND status = 'pending'",
      { id: req.params.id }
    );
    res.json({ refused: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, approve, refuse };

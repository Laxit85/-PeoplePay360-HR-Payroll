// src/modules/attendance/attendance.controller.js
// Owner: Person 3

const pool = require('../../db/pool');

const DAY_COLUMNS = [
  'sunday_hours', 'monday_hours', 'tuesday_hours', 'wednesday_hours',
  'thursday_hours', 'friday_hours', 'saturday_hours',
];

async function flagStatus({ employeeId, workDate, checkIn, checkOut }) {
  if (!checkOut) return 'missing_checkout';

  const [scheduleRows] = await pool.query(
    'SELECT * FROM working_schedules WHERE employee_id = :employeeId',
    { employeeId }
  );
  const schedule = scheduleRows[0];
  if (!schedule) return 'on_time'; // no schedule to compare against yet

  const weekday = new Date(workDate).getDay(); // 0 = Sunday
  const expectedHours = Number(schedule[DAY_COLUMNS[weekday]] || 0);
  const workedHours = (new Date(checkOut) - new Date(checkIn)) / 3600000;

  if (workedHours > expectedHours) return 'overtime';
  if (checkIn && expectedHours > 0) {
    // naive lateness check placeholder — compare against a scheduled start time
    // once WorkingSchedule stores explicit start times instead of just hour totals.
  }
  return 'on_time';
}

async function checkIn(req, res, next) {
  try {
    const { employeeId, workDate, checkIn: checkInTime } = req.body;
    await pool.query(
      `INSERT INTO attendances (employee_id, work_date, check_in, status)
       VALUES (:employeeId, :workDate, :checkInTime, 'on_time')
       ON DUPLICATE KEY UPDATE check_in = VALUES(check_in)`,
      { employeeId, workDate, checkInTime }
    );
    res.status(201).json({ saved: true });
  } catch (err) {
    next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    const { employeeId, workDate, checkOut: checkOutTime } = req.body;
    const [rows] = await pool.query(
      'SELECT * FROM attendances WHERE employee_id = :employeeId AND work_date = :workDate',
      { employeeId, workDate }
    );
    if (!rows[0]) return res.status(404).json({ error: 'No check-in found for this date' });

    const status = await flagStatus({
      employeeId,
      workDate,
      checkIn: rows[0].check_in,
      checkOut: checkOutTime,
    });

    await pool.query(
      `UPDATE attendances SET check_out = :checkOutTime, status = :status
       WHERE employee_id = :employeeId AND work_date = :workDate`,
      { employeeId, workDate, checkOutTime, status }
    );
    res.json({ saved: true, status });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { employeeId, exceptionsOnly } = req.query;
    const conditions = [];
    const params = {};
    if (employeeId) {
      conditions.push('employee_id = :employeeId');
      params.employeeId = employeeId;
    }
    if (exceptionsOnly === 'true') {
      conditions.push("status IN ('late','missing_checkout')");
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT * FROM attendances ${where} ORDER BY work_date DESC`, params);
    res.json({ attendances: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkIn, checkOut, list };

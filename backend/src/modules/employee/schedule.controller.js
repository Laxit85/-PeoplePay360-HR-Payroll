// src/modules/employee/schedule.controller.js
// Owner: Person 2
// Note: total_weekly_hours is a MySQL GENERATED column — never write to it directly.

const pool = require('../../config/db');

async function getByEmployee(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM working_schedules WHERE employee_id = :employeeId',
      { employeeId: req.params.employeeId }
    );
    res.json({ schedule: rows[0] || null });
  } catch (err) {
    next(err);
  }
}

async function upsert(req, res, next) {
  try {
    const { employeeId } = req.params;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const values = { employeeId };
    days.forEach((d) => {
      values[`${d}Hours`] = req.body[`${d}Hours`] ?? 0;
    });

    await pool.query(
      `INSERT INTO working_schedules
         (employee_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours)
       VALUES
         (:employeeId, :mondayHours, :tuesdayHours, :wednesdayHours, :thursdayHours, :fridayHours, :saturdayHours, :sundayHours)
       ON DUPLICATE KEY UPDATE
         monday_hours = VALUES(monday_hours),
         tuesday_hours = VALUES(tuesday_hours),
         wednesday_hours = VALUES(wednesday_hours),
         thursday_hours = VALUES(thursday_hours),
         friday_hours = VALUES(friday_hours),
         saturday_hours = VALUES(saturday_hours),
         sunday_hours = VALUES(sunday_hours)`,
      values
    );
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getByEmployee, upsert };

const { pool } = require('../config/db');

// GET /api/attendance
exports.getAttendances = async (req, res) => {
  try {
    const { employee_id, status, start_date, end_date, department_id } = req.query;

    let query = `
      SELECT 
        a.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        d.name AS department_name,
        CONCAT(u.first_name, ' ', u.last_name) AS corrected_by_name
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees u ON a.corrected_by_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      query += ' AND a.employee_id = ?';
      params.push(employee_id);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (department_id) {
      query += ' AND e.department_id = ?';
      params.push(department_id);
    }
    if (start_date && end_date) {
      query += ' AND a.attendance_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY a.attendance_date DESC, a.check_in DESC';

    const [attendances] = await pool.execute(query, params);
    res.status(200).json({ success: true, count: attendances.length, data: attendances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/attendance/check-in
exports.checkIn = async (req, res) => {
  try {
    const { employee_id } = req.body;

    // Check if open check-in already exists
    const [open] = await pool.execute(
      'SELECT id FROM attendances WHERE employee_id = ? AND check_out IS NULL',
      [employee_id]
    );

    if (open.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee is already checked in. Check out first before clocking in again.'
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const [result] = await pool.execute(
      `INSERT INTO attendances (employee_id, attendance_date, check_in, planned_hours, status) 
       VALUES (?, ?, NOW(), 8.00, 'ON_TIME')`,
      [employee_id, today]
    );

    res.status(201).json({
      success: true,
      message: 'Check-in recorded successfully',
      data: { id: result.insertId, employee_id, attendance_date: today }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/attendance/check-out
exports.checkOut = async (req, res) => {
  try {
    const { employee_id } = req.body;

    const [open] = await pool.execute(
      'SELECT * FROM attendances WHERE employee_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1',
      [employee_id]
    );

    if (open.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No open check-in found for this employee.'
      });
    }

    const record = open[0];
    const checkInTime = new Date(record.check_in);
    const checkOutTime = new Date();
    const diffHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    const workedHours = Math.max(0, Math.round(diffHours * 100) / 100);

    let status = 'ON_TIME';
    let overtime = 0;

    if (workedHours > (record.planned_hours || 8.0)) {
      overtime = Math.round((workedHours - record.planned_hours) * 100) / 100;
      status = 'OVERTIME';
    } else if (workedHours < 4.0) {
      status = 'EARLY_EXIT';
    }

    await pool.execute(
      `UPDATE attendances SET 
        check_out = NOW(), 
        worked_hours = ?, 
        overtime_hours = ?, 
        status = ? 
       WHERE id = ?`,
      [workedHours, overtime, status, record.id]
    );

    res.status(200).json({
      success: true,
      message: 'Check-out recorded successfully',
      data: { id: record.id, worked_hours: workedHours, overtime_hours: overtime, status }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/attendance/:id/correct (Manual correction restricted to HR)
exports.correctAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id;
    const { check_in, check_out, worked_hours, status, correction_reason } = req.body;

    await pool.execute(
      `UPDATE attendances SET
        check_in = COALESCE(?, check_in),
        check_out = COALESCE(?, check_out),
        worked_hours = COALESCE(?, worked_hours),
        status = COALESCE(?, status),
        is_corrected = 1,
        correction_reason = ?,
        corrected_by_user_id = ?
       WHERE id = ?`,
      [
        check_in, check_out, worked_hours, status,
        correction_reason || 'Manual administrative correction',
        req.user.id,
        attendanceId
      ]
    );

    res.status(200).json({ success: true, message: 'Attendance corrected successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/attendance/:id
exports.deleteAttendance = async (req, res) => {
  try {
    await pool.execute('DELETE FROM attendances WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/attendance/clock (Toggle check-in/out)
exports.clock = async (req, res) => {
  try {
    let employeeId = req.body.employee_id;
    if (!employeeId && req.user) {
      const [empRows] = await pool.execute('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
      if (empRows.length > 0) employeeId = empRows[0].id;
    }
    if (!employeeId) employeeId = 1;

    const [open] = await pool.execute(
      'SELECT id FROM attendances WHERE employee_id = ? AND check_out IS NULL',
      [employeeId]
    );

    req.body.employee_id = employeeId;
    if (open.length > 0) {
      return exports.checkOut(req, res);
    } else {
      return exports.checkIn(req, res);
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/attendance/stats
exports.getAttendanceStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [[{ total_present }]] = await pool.execute(
      'SELECT COUNT(DISTINCT employee_id) AS total_present FROM attendances WHERE attendance_date = ?',
      [today]
    );
    const [[{ total_employees }]] = await pool.execute('SELECT COUNT(*) AS total_employees FROM employees WHERE employment_status = "ACTIVE"');

    res.status(200).json({
      success: true,
      data: {
        presentToday: total_present,
        totalActiveEmployees: total_employees,
        attendanceRate: total_employees > 0 ? Math.round((total_present / total_employees) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

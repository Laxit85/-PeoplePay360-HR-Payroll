const { pool } = require('../config/db');

// GET /api/working-schedules
exports.getSchedules = async (req, res) => {
  try {
    const [schedules] = await pool.execute(
      `SELECT ws.*, COUNT(e.id) AS assigned_employees_count 
       FROM working_schedules ws 
       LEFT JOIN employees e ON ws.id = e.working_schedule_id 
       GROUP BY ws.id 
       ORDER BY ws.name ASC`
    );

    const formatted = schedules.map(ws => {
      const typeStr = ws.type || 'STANDARD';
      const calType = typeStr === 'STANDARD' ? 'Standard 40h' : (typeStr === 'SHIFT_BASED' ? 'Shift Based' : 'Flexible');
      const hrs = parseFloat(ws.total_weekly_hours || 40);
      return {
        ...ws,
        id: ws.id,
        name: ws.name,
        calendarType: calType,
        daysPerWeek: 5,
        hoursPerWeek: hrs,
        total_weekly_hours: hrs,
        company: 'OXP Global Inc.',
        status: ws.is_active ? 'Active' : 'Inactive',
        assignedEmployeesCount: ws.assigned_employees_count
      };
    });

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/working-schedules/:id (with daily lines)
exports.getScheduleById = async (req, res) => {
  try {
    const [schedules] = await pool.execute('SELECT * FROM working_schedules WHERE id = ?', [req.params.id]);
    if (schedules.length === 0) {
      return res.status(404).json({ success: false, message: 'Working schedule not found' });
    }

    const [lines] = await pool.execute(
      'SELECT * FROM schedule_lines WHERE schedule_id = ? ORDER BY FIELD(day_of_week, "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")',
      [req.params.id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...schedules[0],
        schedule_lines: lines
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/working-schedules (auto-computes total_weekly_hours)
exports.createSchedule = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { name, type, calendarType, hoursPerWeek, status, schedule_lines } = req.body;

    // Map type
    let assignedType = type || 'STANDARD';
    if (calendarType) {
      if (calendarType.toLowerCase().includes('shift')) assignedType = 'SHIFT_BASED';
      else if (calendarType.toLowerCase().includes('flex')) assignedType = 'FLEXIBLE';
      else assignedType = 'STANDARD';
    }

    // Calculate total weekly hours
    let totalHours = hoursPerWeek ? parseFloat(hoursPerWeek) : 40.0;
    if (schedule_lines && Array.isArray(schedule_lines) && schedule_lines.length > 0) {
      totalHours = schedule_lines.reduce((acc, line) => {
        return line.work_type === 'WORKDAY' ? acc + parseFloat(line.work_hours || 0) : acc;
      }, 0);
    }

    const isActive = status === 'Inactive' ? 0 : 1;

    const [result] = await connection.execute(
      'INSERT INTO working_schedules (name, type, total_weekly_hours, is_active) VALUES (?, ?, ?, ?)',
      [name, assignedType, totalHours, isActive]
    );

    const scheduleId = result.insertId;

    if (schedule_lines && Array.isArray(schedule_lines) && schedule_lines.length > 0) {
      for (const line of schedule_lines) {
        await connection.execute(
          `INSERT INTO schedule_lines (schedule_id, day_of_week, work_type, start_time, end_time, break_hours, work_hours) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            scheduleId,
            line.day_of_week,
            line.work_type || 'WORKDAY',
            line.start_time || '09:00:00',
            line.end_time || '17:00:00',
            line.break_hours || 1.0,
            line.work_hours || 7.0
          ]
        );
      }
    }

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Working schedule created successfully',
      data: { id: scheduleId, name, type: assignedType, total_weekly_hours: totalHours }
    });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// PUT /api/working-schedules/:id
exports.updateSchedule = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const scheduleId = req.params.id;
    const { name, type, calendarType, hoursPerWeek, status, schedule_lines } = req.body;

    let assignedType = type;
    if (calendarType) {
      if (calendarType.toLowerCase().includes('shift')) assignedType = 'SHIFT_BASED';
      else if (calendarType.toLowerCase().includes('flex')) assignedType = 'FLEXIBLE';
      else assignedType = 'STANDARD';
    }

    let totalHours = hoursPerWeek ? parseFloat(hoursPerWeek) : null;
    if (schedule_lines && Array.isArray(schedule_lines) && schedule_lines.length > 0) {
      totalHours = schedule_lines.reduce((acc, line) => {
        return line.work_type === 'WORKDAY' ? acc + parseFloat(line.work_hours || 0) : acc;
      }, 0);

      // Re-insert lines
      await connection.execute('DELETE FROM schedule_lines WHERE schedule_id = ?', [scheduleId]);
      for (const line of schedule_lines) {
        await connection.execute(
          `INSERT INTO schedule_lines (schedule_id, day_of_week, work_type, start_time, end_time, break_hours, work_hours) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            scheduleId,
            line.day_of_week,
            line.work_type || 'WORKDAY',
            line.start_time || '09:00:00',
            line.end_time || '17:00:00',
            line.break_hours || 1.0,
            line.work_hours || 7.0
          ]
        );
      }
    }

    const isActive = status !== undefined ? (status === 'Inactive' ? 0 : 1) : null;

    await connection.execute(
      `UPDATE working_schedules SET 
        name = COALESCE(?, name), 
        type = COALESCE(?, type), 
        total_weekly_hours = COALESCE(?, total_weekly_hours),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, assignedType, totalHours, isActive, scheduleId]
    );

    await connection.commit();
    res.status(200).json({ success: true, message: 'Working schedule updated successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// DELETE /api/working-schedules/:id
exports.deleteSchedule = async (req, res) => {
  try {
    await pool.execute('DELETE FROM working_schedules WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true, message: 'Working schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

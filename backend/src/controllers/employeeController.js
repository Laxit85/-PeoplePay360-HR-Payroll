const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/employees (with filters and search)
exports.getEmployees = async (req, res) => {
  try {
    const { department_id, status, type, search } = req.query;
    let query = `
      SELECT 
        e.*,
        d.name AS department_name,
        d.code AS department_code,
        jp.title AS job_position_title,
        ws.name AS working_schedule_name,
        ws.total_weekly_hours,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN working_schedules ws ON e.working_schedule_id = ws.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE 1=1
    `;

    const params = [];

    if (department_id) {
      query += ' AND e.department_id = ?';
      params.push(department_id);
    }
    if (status) {
      query += ' AND e.employment_status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND e.employee_type = ?';
      params.push(type);
    }
    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY e.id DESC';

    const [employees] = await pool.execute(query, params);
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/employees/:id (with Smart Counters & Active Contract)
exports.getEmployeeById = async (req, res) => {
  try {
    const employeeId = req.params.id;

    const [employees] = await pool.execute(
      `SELECT 
        e.*,
        d.name AS department_name,
        d.code AS department_code,
        jp.title AS job_position_title,
        ws.name AS working_schedule_name,
        ws.total_weekly_hours,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN working_schedules ws ON e.working_schedule_id = ws.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = ?`,
      [employeeId]
    );

    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const employee = employees[0];

    // Smart Counters
    const [[{ contracts_count }]] = await pool.execute(
      'SELECT COUNT(*) AS contracts_count FROM contracts WHERE employee_id = ?',
      [employeeId]
    );
    const [[{ attendance_count }]] = await pool.execute(
      'SELECT COUNT(*) AS attendance_count FROM attendances WHERE employee_id = ?',
      [employeeId]
    );
    const [[{ time_off_count }]] = await pool.execute(
      'SELECT COUNT(*) AS time_off_count FROM time_off_requests WHERE employee_id = ?',
      [employeeId]
    );
    const [[{ allocations_count }]] = await pool.execute(
      'SELECT COUNT(*) AS allocations_count FROM time_off_allocations WHERE employee_id = ?',
      [employeeId]
    );
    const [[{ payslips_count }]] = await pool.execute(
      'SELECT COUNT(*) AS payslips_count FROM payslips WHERE employee_id = ?',
      [employeeId]
    );

    // Active Contract lookup
    const [activeContracts] = await pool.execute(
      `SELECT c.*, ss.name AS salary_structure_name, ss.code AS salary_structure_code
       FROM contracts c
       JOIN salary_structures ss ON c.salary_structure_id = ss.id
       WHERE c.employee_id = ? AND c.status = 'ACTIVE'
       LIMIT 1`,
      [employeeId]
    );

    res.status(200).json({
      success: true,
      data: employee,
      smartCounters: {
        contractsCount: contracts_count,
        attendanceCount: attendance_count,
        timeOffCount: time_off_count,
        allocationsCount: allocations_count,
        payslipsCount: payslips_count
      },
      activeContract: activeContracts[0] || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/employees (Auto-links or creates linked User account if user_id is not passed)
exports.createEmployee = async (req, res) => {
  try {
    const {
      employee_code,
      first_name,
      last_name,
      email,
      phone,
      department_id,
      job_position_id,
      manager_id,
      working_schedule_id,
      employee_type,
      employment_status,
      joining_date,
      bank_name,
      bank_account_no,
      bank_ifsc_or_routing,
      tax_id_or_pan,
      user_id
    } = req.body;

    let assignedUserId = user_id || null;

    // If user_id is not explicitly passed, auto-link or auto-create user login account
    if (!assignedUserId && email) {
      const [existingUser] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
        assignedUserId = existingUser[0].id;
      } else {
        // Auto-create user account with default role EMPLOYEE (role_id: 5)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Employee123!', salt);
        const [newUser] = await pool.execute(
          'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
          [email, passwordHash, 5]
        );
        assignedUserId = newUser.insertId;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO employees (
        employee_code, first_name, last_name, email, phone,
        department_id, job_position_id, manager_id, working_schedule_id,
        employee_type, employment_status, joining_date,
        bank_name, bank_account_no, bank_ifsc_or_routing, tax_id_or_pan, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_code, first_name, last_name, email, phone || null,
        department_id || 1, job_position_id || 1, manager_id || null, working_schedule_id || 1,
        employee_type || 'FULL_TIME', employment_status || 'ACTIVE', joining_date || new Date().toISOString().split('T')[0],
        bank_name || null, bank_account_no || null, bank_ifsc_or_routing || null, tax_id_or_pan || null,
        assignedUserId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully and linked to User account',
      data: {
        id: result.insertId,
        user_id: assignedUserId,
        ...req.body
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const fields = req.body;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'department_id',
      'job_position_id', 'manager_id', 'working_schedule_id', 'employee_type',
      'employment_status', 'joining_date', 'bank_name', 'bank_account_no',
      'bank_ifsc_or_routing', 'tax_id_or_pan', 'user_id'
    ];

    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
    }

    values.push(employeeId);
    const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;

    await pool.execute(query, values);
    res.status(200).json({ success: true, message: 'Employee updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    await pool.execute('DELETE FROM employees WHERE id = ?', [employeeId]);
    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

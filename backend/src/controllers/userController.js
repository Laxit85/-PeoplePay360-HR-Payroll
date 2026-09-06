const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// GET /api/users (Admin only: view all users with roles and linked employee details)
exports.getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.role_id,
        r.name AS role,
        r.description AS role_description,
        u.is_active,
        u.created_at,
        e.id AS employee_id,
        e.employee_code,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        d.name AS department_name,
        jp.title AS job_position_title
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees e ON (e.user_id = u.id OR e.email = u.email)
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      ORDER BY u.id ASC
    `);

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.employee_name ? u.employee_name.trim() : u.email.split('@')[0],
      email: u.email,
      role: u.role || 'EMPLOYEE',
      role_id: u.role_id,
      status: u.is_active ? 'Active' : 'Inactive',
      is_active: Boolean(u.is_active),
      employeeId: u.employee_id,
      employeeCode: u.employee_code,
      department: u.department_name || 'General',
      jobTitle: u.job_position_title || 'Staff',
      created_at: u.created_at
    }));

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users (Admin only: create a new user with assigned role)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, role_id, employee_id, employeeId } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    // Resolve role_id
    let assignedRoleId = role_id;
    if (!assignedRoleId && role) {
      const [roleRows] = await pool.query('SELECT id FROM roles WHERE UPPER(name) = ?', [String(role).toUpperCase()]);
      if (roleRows.length > 0) {
        assignedRoleId = roleRows[0].id;
      }
    }
    if (!assignedRoleId) assignedRoleId = 5; // Default: EMPLOYEE

    const plainPassword = password || 'password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, role_id, is_active) VALUES (?, ?, ?, 1)',
      [cleanEmail, passwordHash, assignedRoleId]
    );

    const newUserId = result.insertId;

    // Resolve employee linking / auto-creation with provided employee name
    const [existingEmp] = await pool.query('SELECT id FROM employees WHERE email = ?', [cleanEmail]);
    let targetEmpId = employee_id || employeeId || (existingEmp[0]?.id || null);

    if (existingEmp.length > 0) {
      targetEmpId = existingEmp[0].id;
      if (name) {
        const parts = name.trim().split(' ');
        const fName = parts[0];
        const lName = parts.slice(1).join(' ') || '';
        await pool.query('UPDATE employees SET first_name = ?, last_name = ?, user_id = ? WHERE id = ?', [fName, lName, newUserId, targetEmpId]);
      } else {
        await pool.query('UPDATE employees SET user_id = ? WHERE id = ?', [newUserId, targetEmpId]);
      }
    } else if (name) {
      // Auto-create linked employee record
      const parts = name.trim().split(' ');
      const fName = parts[0];
      const lName = parts.slice(1).join(' ') || 'Employee';
      const code = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const [newEmp] = await pool.query(
        `INSERT INTO employees (employee_code, first_name, last_name, email, user_id, department_id, job_position_id, employment_status, employee_type)
         VALUES (?, ?, ?, ?, ?, 1, 1, 'ACTIVE', 'FULL_TIME')`,
        [code, fName, lName, cleanEmail, newUserId]
      );
      targetEmpId = newEmp.insertId;

      // Auto-provision contract and leave allocations
      try {
        await pool.query(
          `INSERT INTO contracts (employee_id, reference_name, salary_structure_id, working_schedule_id, wage, wage_type, start_date, status)
           VALUES (?, ?, 1, 1, 35000, 'MONTHLY', CURDATE(), 'ACTIVE')`,
          [targetEmpId, `${fName} ${lName} - Employment Agreement`]
        );
        await pool.query(
          `INSERT INTO time_off_allocations 
           (employee_id, time_off_type_id, allocated_days, taken_days, remaining_days, valid_from, valid_to, status, approved_by_user_id)
           VALUES 
           (?, 1, 20.00, 0.00, 20.00, '2026-01-01', '2026-12-31', 'APPROVED', 1),
           (?, 2, 12.00, 0.00, 12.00, '2026-01-01', '2026-12-31', 'APPROVED', 1)`,
          [targetEmpId, targetEmpId]
        );
      } catch (errAuto) {
        console.error('Warning auto-provisioning for user:', errAuto);
      }
    }

    const [roleRows] = await pool.query('SELECT name FROM roles WHERE id = ?', [assignedRoleId]);

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        id: newUserId,
        email: cleanEmail,
        role: roleRows[0]?.name || 'EMPLOYEE',
        role_id: assignedRoleId,
        is_active: true,
        employee_id: targetEmpId || null
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/users/:id (Admin only: update user role, email, status)
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, role, role_id, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let assignedRoleId = role_id;
    if (!assignedRoleId && role) {
      const [roleRows] = await pool.query('SELECT id FROM roles WHERE UPPER(name) = ?', [String(role).toUpperCase()]);
      if (roleRows.length > 0) assignedRoleId = roleRows[0].id;
    }

    const updates = [];
    const values = [];

    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (assignedRoleId !== undefined) {
      updates.push('role_id = ?');
      values.push(assignedRoleId);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(userId);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/users/:id/toggle-status (Admin only: deactivate/activate account)
exports.toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const [[user]] = await pool.query('SELECT id, is_active FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newStatus = user.is_active ? 0 : 1;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);

    res.status(200).json({
      success: true,
      message: `User account ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: Boolean(newStatus)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

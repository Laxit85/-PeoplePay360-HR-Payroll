const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'peoplepay360_secret_jwt_2026', {
    expiresIn: '30d'
  });
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, role_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check if user already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const assignedRoleId = role_id || 5; // Default: EMPLOYEE (id: 5)

    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
      [email, passwordHash, assignedRoleId]
    );

    const [roleRows] = await pool.execute('SELECT name FROM roles WHERE id = ?', [assignedRoleId]);
    const roleName = roleRows[0]?.name || 'EMPLOYEE';

    const token = generateToken(result.insertId, roleName);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: result.insertId,
        email,
        role: roleName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.password_hash, u.is_active, r.name AS role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if linked to an employee record
    const [employees] = await pool.execute(
      `SELECT id, employee_code, first_name, last_name FROM employees WHERE user_id = ?`,
      [user.id]
    );

    const token = generateToken(user.id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: employees[0] || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const [employees] = await pool.execute(
      `SELECT e.*, d.name AS department_name, jp.title AS job_position_title 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       LEFT JOIN job_positions jp ON e.job_position_id = jp.id 
       WHERE e.user_id = ?`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      user: {
        ...req.user,
        employee: employees[0] || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/users
exports.getUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT 
        u.id,
        u.email,
        u.is_active,
        r.name AS role,
        e.id AS employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees e ON e.user_id = u.id
      ORDER BY u.id ASC
    `);

    const formatted = users.map(u => ({
      id: u.id,
      name: u.employee_name || u.email.split('@')[0],
      email: u.email,
      role: u.role,
      status: u.is_active ? 'Active' : 'Inactive',
      employeeId: u.employee_id || null
    }));

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/users
exports.createUser = async (req, res) => {
  try {
    const { email, password, role, role_id, employeeId, employee_id, status } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Resolve role_id
    let assignedRoleId = role_id;
    if (!assignedRoleId && role) {
      const [roleRows] = await pool.execute('SELECT id FROM roles WHERE name = ?', [role]);
      if (roleRows.length > 0) assignedRoleId = roleRows[0].id;
    }
    if (!assignedRoleId) assignedRoleId = 5; // Default EMPLOYEE

    const pwdToHash = password || 'Password@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pwdToHash, salt);
    const isActive = status === 'Inactive' ? 0 : 1;

    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?)',
      [email, passwordHash, assignedRoleId, isActive]
    );

    const newUserId = result.insertId;

    // Link to employee if employeeId provided
    const targetEmpId = employeeId || employee_id;
    if (targetEmpId) {
      const cleanEmpId = String(targetEmpId).replace(/^emp-/i, '');
      await pool.execute('UPDATE employees SET user_id = ? WHERE id = ?', [newUserId, cleanEmpId]);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUserId,
        email,
        role: role || 'EMPLOYEE',
        status: isActive ? 'Active' : 'Inactive',
        employeeId: targetEmpId || null
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

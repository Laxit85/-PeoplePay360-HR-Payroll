// src/modules/auth/auth.service.js
// Owner: Person 1

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.role_id, r.name AS role,
            e.id AS employee_id, e.employee_code, e.first_name, e.last_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     LEFT JOIN employees e ON (e.user_id = u.id OR e.email = u.email)
     WHERE u.email = :email`,
    { email }
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    role_id: row.role_id,
    role: row.role,
    employee_id: row.employee_id,
    employee: row.employee_id ? {
      id: row.employee_id,
      employee_code: row.employee_code,
      first_name: row.first_name,
      last_name: row.last_name
    } : null
  };
}

async function createUser({ email, password, role, employeeId = null }) {
  const passwordHash = await bcrypt.hash(password, 10);
  let roleId = typeof role === 'number' ? role : 5;
  if (typeof role === 'string') {
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE LOWER(name) = :role', { role: role.toLowerCase() });
    if (roleRows.length > 0) roleId = roleRows[0].id;
  }
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, role_id)
     VALUES (:email, :passwordHash, :roleId)`,
    { email, passwordHash, roleId }
  );
  return { id: result.insertId, email, role, employeeId };
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, employeeId: user.employee_id ?? null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

module.exports = { findUserByEmail, createUser, verifyPassword, signToken };

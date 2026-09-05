// src/modules/auth/auth.service.js
// Owner: Person 1

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = :email', { email });
  return rows[0] || null;
}

async function createUser({ email, password, role, employeeId = null }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, role, employee_id)
     VALUES (:email, :passwordHash, :role, :employeeId)`,
    { email, passwordHash, role, employeeId }
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

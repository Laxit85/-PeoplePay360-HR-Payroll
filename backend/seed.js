// seed.js
// Seeds initial user accounts into MySQL (safe to re-run)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const USERS = [
  { email: 'admin@peoplepay360.test', password: 'password123', role: 'admin' },
  { email: 'hr@peoplepay360.test', password: 'password123', role: 'hr_manager' },
  { email: 'payroll@peoplepay360.test', password: 'password123', role: 'payroll_officer' },
  { email: 'employee@peoplepay360.test', password: 'password123', role: 'employee' },
];

async function seed() {
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES (:email, :hash, :role)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      { email: u.email, hash, role: u.role }
    );
    console.log(`seeded ${u.role} -> ${u.email} / ${u.password}`);
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

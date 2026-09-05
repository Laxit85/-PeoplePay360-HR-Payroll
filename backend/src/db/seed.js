// src/db/seed.js
// Owner: Person 1 — creates one login per role so teammates can test
// against real auth immediately. Safe to re-run (uses INSERT ... ON DUPLICATE).
//
// Usage: npm run seed

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./pool');

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

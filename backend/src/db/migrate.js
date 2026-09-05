// src/db/migrate.js
// Runs every .sql file in migrations/ in filename order, skipping ones
// already applied (tracked in the `migrations` bookkeeping table).
//
// Usage: npm run migrate

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  await connection.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [applied] = await connection.query('SELECT filename FROM migrations');
  const appliedSet = new Set(applied.map((row) => row.filename));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`apply ${file}`);
    await connection.query(sql);
    await connection.query('INSERT INTO migrations (filename) VALUES (?)', [file]);
  }

  console.log('Migrations complete.');
  await connection.end();
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

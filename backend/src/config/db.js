const mysql = require('mysql2/promise');
require('dotenv').config();

// Standard XAMPP MySQL Connection Pool Config
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'peoplepay360',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
});

// Test Database Connection Function
const testDBConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to XAMPP MySQL (${process.env.DB_NAME || 'peoplepay360'}) on port ${process.env.DB_PORT || 3307}`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`[Database Error] Could not connect to XAMPP MySQL on port ${process.env.DB_PORT || 3307}: ${error.message}`);
    console.error('Hint: Ensure MySQL is started in XAMPP Control Panel and database is created.');
    return false;
  }
};

module.exports = {
  pool,
  testDBConnection
};

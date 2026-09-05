require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function createDatabaseAndTables() {
  console.log('====================================================');
  console.log(' PeoplePay360 : XAMPP MySQL Database Initializer');
  console.log('====================================================');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    multipleStatements: true
  };

  console.log(`Connecting to MySQL on ${config.host}:${config.port} as user '${config.user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log(' Connected to XAMPP MySQL server successfully!');

    // Read schema.sql
    const sqlPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`schema.sql not found at: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(' Executing schema.sql to create database and tables...');

    await connection.query('DROP DATABASE IF EXISTS `peoplepay360`');
    await connection.query(sqlContent);

    // Verify created tables
    await connection.query('USE `peoplepay360`');
    const [tables] = await connection.query('SHOW TABLES');

    console.log('\n SUCCESS! All tables created in database `peoplepay360`:');
    tables.forEach((t, i) => {
      const tableName = Object.values(t)[0];
      console.log(`  ${i + 1}. ${tableName}`);
    });

    console.log('\n====================================================');
    console.log(' Database is ready! You can now view it in phpMyAdmin');
    console.log(' http://localhost/phpmyadmin');
    console.log('====================================================');

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR creating tables:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('\nHint: Is Apache & MySQL running in your XAMPP Control Panel?');
      console.error('Please open XAMPP Control Panel and click "Start" next to MySQL.');
    }
    if (connection) await connection.end();
    process.exit(1);
  }
}

createDatabaseAndTables();

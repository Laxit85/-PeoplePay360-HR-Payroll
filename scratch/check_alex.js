const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const { pool } = require('../backend/src/config/db');

async function main() {
  try {
    const [emps] = await pool.execute(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.user_id, 
             c.id AS contract_id, c.wage, c.status AS contract_status
      FROM employees e 
      LEFT JOIN contracts c ON e.id = c.employee_id 
      WHERE e.first_name LIKE '%Alex%' OR e.id = 1
    `);
    console.log('Alex / ID 1 Employee:', emps);

    const [ps] = await pool.execute(`
      SELECT p.*, e.first_name, e.last_name
      FROM payslips p 
      JOIN employees e ON p.employee_id = e.id 
      WHERE p.id = 1 OR e.first_name LIKE '%Alex%'
    `);
    console.log('Payslips:', ps);

    const [rules] = await pool.execute(`
      SELECT pl.id, pl.payslip_id, pl.code, pl.name, pl.amount, pl.total 
      FROM payslip_lines pl 
      WHERE pl.payslip_id = 1
    `);
    console.log('Payslip 1 Lines:', rules);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

main();

const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const { pool } = require('../backend/src/config/db');

async function main() {
  try {
    const [[{ totalEmps }]] = await pool.execute('SELECT COUNT(*) AS totalEmps FROM employees');
    const [[{ type1Emps }]] = await pool.execute("SELECT COUNT(DISTINCT employee_id) AS type1Emps FROM time_off_allocations WHERE time_off_type_id = 1 AND status = 'APPROVED'");
    const [[{ type2Emps }]] = await pool.execute("SELECT COUNT(DISTINCT employee_id) AS type2Emps FROM time_off_allocations WHERE time_off_type_id = 2 AND status = 'APPROVED'");
    console.log('Coverage:', { totalEmps, type1Emps, type2Emps });

    // Check employees who lack type 1 or type 2
    const [missing] = await pool.execute(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name
      FROM employees e
      WHERE e.id NOT IN (SELECT employee_id FROM time_off_allocations WHERE time_off_type_id = 1 AND status = 'APPROVED')
         OR e.id NOT IN (SELECT employee_id FROM time_off_allocations WHERE time_off_type_id = 2 AND status = 'APPROVED')
    `);
    console.log('Employees missing allocations count:', missing.length);
    if (missing.length > 0) {
      console.log('Sample missing:', missing.slice(0, 5));
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

main();

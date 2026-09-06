const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const { pool } = require('../backend/src/config/db');

async function syncLeaves() {
  try {
    console.log('--- 1. Renaming Type 2 to Paid Sick Leave ---');
    await pool.execute("UPDATE time_off_types SET name = 'Paid Sick Leave' WHERE id = 2");

    console.log('--- 2. Fetching all employees ---');
    const [employees] = await pool.execute('SELECT id, employee_code, first_name, last_name FROM employees');
    console.log(`Total employees: ${employees.length}`);

    let addedAnnual = 0;
    let addedSick = 0;

    for (const emp of employees) {
      // Check Paid Annual Leave (Type 1)
      const [hasAnnual] = await pool.execute(
        'SELECT id FROM time_off_allocations WHERE employee_id = ? AND time_off_type_id = 1',
        [emp.id]
      );
      if (hasAnnual.length === 0) {
        await pool.execute(
          `INSERT INTO time_off_allocations 
           (employee_id, time_off_type_id, allocated_days, taken_days, remaining_days, valid_from, valid_to, status, approved_by_user_id)
           VALUES (?, 1, 20.00, 0.00, 20.00, '2026-01-01', '2026-12-31', 'APPROVED', 1)`,
          [emp.id]
        );
        addedAnnual++;
      }

      // Check Paid Sick Leave (Type 2)
      const [hasSick] = await pool.execute(
        'SELECT id FROM time_off_allocations WHERE employee_id = ? AND time_off_type_id = 2',
        [emp.id]
      );
      if (hasSick.length === 0) {
        await pool.execute(
          `INSERT INTO time_off_allocations 
           (employee_id, time_off_type_id, allocated_days, taken_days, remaining_days, valid_from, valid_to, status, approved_by_user_id)
           VALUES (?, 2, 12.00, 0.00, 12.00, '2026-01-01', '2026-12-31', 'APPROVED', 1)`,
          [emp.id]
        );
        addedSick++;
      }
    }

    console.log(`Added Paid Annual Leave for ${addedAnnual} employees.`);
    console.log(`Added Paid Sick Leave for ${addedSick} employees.`);

    // Summary verification
    const [[{ totalAnnual }]] = await pool.execute(
      "SELECT COUNT(*) AS totalAnnual FROM time_off_allocations WHERE time_off_type_id = 1 AND status = 'APPROVED'"
    );
    const [[{ totalSick }]] = await pool.execute(
      "SELECT COUNT(*) AS totalSick FROM time_off_allocations WHERE time_off_type_id = 2 AND status = 'APPROVED'"
    );
    console.log(`Verification: Total active Paid Annual Leave allocations: ${totalAnnual}, Total active Paid Sick Leave allocations: ${totalSick}`);

  } catch (err) {
    console.error('Error during sync:', err);
  } finally {
    process.exit();
  }
}

syncLeaves();

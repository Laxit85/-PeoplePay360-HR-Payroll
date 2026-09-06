const { pool } = require('../config/db');

async function sync() {
  console.log('=== Starting Full Synchronization: Contract Wage, 9am-6pm Attendances & Contract Periods ===\n');

  // 1. Fetch all employees and their active contracts
  const [employees] = await pool.query(`
    SELECT 
      e.id, 
      e.employee_code, 
      e.first_name, 
      e.last_name, 
      c.id AS contract_id,
      c.reference_name,
      c.wage,
      c.start_date,
      c.end_date,
      c.status AS contract_status
    FROM employees e
    LEFT JOIN contracts c ON c.id = (
      SELECT id FROM contracts 
      WHERE employee_id = e.id AND status = 'ACTIVE' 
      ORDER BY id DESC LIMIT 1
    )
    WHERE e.employment_status = 'ACTIVE'
    ORDER BY e.id ASC
  `);

  console.log(`Found ${employees.length} active employees to evaluate.`);

  // 2. September 2026 Payrun Dates
  const sepStart = '2026-09-01';
  const sepEnd = '2026-09-30';

  // Get September Payrun Id
  const [payruns] = await pool.query('SELECT id FROM payruns WHERE period_start LIKE "2026-09%" OR period_start LIKE "2026-08-31%" LIMIT 1');
  const sepPayrunId = payruns.length > 0 ? payruns[0].id : 1;

  // Helper to generate working days (Mon-Fri) between two ISO date strings
  function getWorkingDays(startStr, endStr) {
    const days = [];
    const curr = new Date(startStr);
    const end = new Date(endStr);
    while (curr <= end) {
      const dow = curr.getDay();
      if (dow !== 0 && dow !== 6) {
        days.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }

  // Month-wide working days in Sep 2026
  const fullMonthWorkingDays = getWorkingDays(sepStart, sepEnd);
  console.log(`September 2026 standard work days: ${fullMonthWorkingDays.length} days (176 hrs).`);

  // 3. Populate Attendances for every active contract in September 2026
  console.log('\n--- Syncing Attendance Records (In: 09:00 AM, Out: 06:00 PM) ---');
  let insertedAttendances = 0;

  for (const emp of employees) {
    if (!emp.contract_id || emp.wage == null) {
      // Ensure employee has a fallback contract if missing
      const [cRes] = await pool.query(`
        INSERT INTO contracts (employee_id, salary_structure_id, working_schedule_id, reference_name, wage, wage_type, start_date, status)
        VALUES (?, 1, 1, ?, 50000.00, 'MONTHLY', '2026-01-01', 'ACTIVE')
      `, [emp.id, `${emp.first_name} ${emp.last_name} - Corporate Agreement`]);
      emp.contract_id = cRes.insertId;
      emp.wage = '50000.00';
      emp.start_date = '2026-01-01';
      emp.end_date = null;
    }

    // Determine contract-bound effective dates for September
    const cStart = emp.start_date ? new Date(emp.start_date).toISOString().split('T')[0] : sepStart;
    const cEnd = emp.end_date ? new Date(emp.end_date).toISOString().split('T')[0] : null;

    // Check if contract was active during September
    if (cStart > sepEnd) continue; // Joined after September
    if (cEnd && cEnd < sepStart) continue; // Expired before September

    const effectiveStart = cStart > sepStart ? cStart : sepStart;
    const effectiveEnd = cEnd && cEnd < sepEnd ? cEnd : sepEnd;

    const contractWorkingDays = getWorkingDays(effectiveStart, effectiveEnd);

    // Insert attendance entries for each working day if not already present
    for (const dayStr of contractWorkingDays) {
      const [existing] = await pool.query(
        'SELECT id FROM attendances WHERE employee_id = ? AND attendance_date = ?',
        [emp.id, dayStr]
      );

      if (existing.length === 0) {
        await pool.query(`
          INSERT INTO attendances 
          (employee_id, attendance_date, check_in, check_out, planned_hours, worked_hours, overtime_hours, status)
          VALUES (?, ?, ?, ?, 8.00, 8.00, 0.00, 'ON_TIME')
        `, [
          emp.id, 
          dayStr, 
          `${dayStr} 09:00:00`, 
          `${dayStr} 18:00:00`
        ]);
        insertedAttendances++;
      }
    }
  }

  console.log(`✓ Inserted ${insertedAttendances} new standard (9am - 6pm) attendance logs.`);

  // 4. Synchronize Payslips strictly according to each employee's contract wage & attendances
  console.log('\n--- Syncing Payslips & Line Items According to Contract Wage & Attendances ---');

  let batchGross = 0;
  let batchDeductions = 0;
  let batchNet = 0;
  let syncedSlips = 0;

  for (const emp of employees) {
    const cStart = emp.start_date ? new Date(emp.start_date).toISOString().split('T')[0] : sepStart;
    const cEnd = emp.end_date ? new Date(emp.end_date).toISOString().split('T')[0] : null;

    if (cStart > sepEnd) continue;
    if (cEnd && cEnd < sepStart) continue;

    const effectiveStart = cStart > sepStart ? cStart : sepStart;
    const effectiveEnd = cEnd && cEnd < sepEnd ? cEnd : sepEnd;

    // Calculate scheduled working days in contract period
    const contractWorkingDays = getWorkingDays(effectiveStart, effectiveEnd);
    const scheduledDays = contractWorkingDays.length;

    // Query actual attendance days & hours in effective contract period
    const [[attSummary]] = await pool.query(`
      SELECT 
        COUNT(DISTINCT attendance_date) AS attended_days,
        COALESCE(SUM(worked_hours), 0) AS total_worked_hours
      FROM attendances
      WHERE employee_id = ? 
        AND attendance_date BETWEEN ? AND ?
        AND check_in IS NOT NULL
    `, [emp.id, effectiveStart, effectiveEnd]);

    const attendedDays = parseFloat(attSummary.attended_days) || scheduledDays;
    const workedDays = Math.min(attendedDays, scheduledDays);
    const workedHours = workedDays * 8.0;

    // Contract wage & Daily Wage Calculation:
    // per day = monthly wage / days
    // earned wage = per day * present days
    const wage = parseFloat(emp.wage) || 50000;
    const perDayWage = scheduledDays > 0 ? (wage / scheduledDays) : wage;
    const earnedWage = Math.round(perDayWage * workedDays * 100) / 100;

    // Calculate standard Indian Payroll structure based on earned wage:
    // Basic = 50% of Earned Wage
    // HRA = 20% of Earned Wage (40% of Basic)
    // Special Allowance = 15% of Earned Wage (30% of Basic)
    // Gross = Basic + HRA + Spl = 85% of Earned Wage
    // PF = 12% of Basic
    // TDS / Tax = 5% of Gross
    // Net = Gross - (PF + TDS)
    const basic = Math.round(earnedWage * 0.50);
    const hra = Math.round(earnedWage * 0.20);
    const splAllowance = Math.round(earnedWage * 0.15);
    const gross = basic + hra + splAllowance;
    const pf = Math.round(basic * 0.12);
    const tds = Math.round(gross * 0.05);
    const deductions = pf + tds;
    const net = gross - deductions;

    // Check if payslip exists for September
    const [existingSlips] = await pool.query(
      'SELECT id FROM payslips WHERE payrun_id = ? AND employee_id = ?',
      [sepPayrunId, emp.id]
    );

    let slipId = null;
    if (existingSlips.length > 0) {
      slipId = existingSlips[0].id;
      await pool.query(`
        UPDATE payslips SET
          contract_id = ?,
          period_start = ?,
          period_end = ?,
          scheduled_work_days = ?,
          worked_days = ?,
          unpaid_leave_days = 0.0,
          gross_salary = ?,
          total_deductions = ?,
          net_salary = ?,
          status = 'PAID'
        WHERE id = ?
      `, [
        emp.contract_id,
        effectiveStart,
        effectiveEnd,
        scheduledDays,
        workedDays,
        gross,
        deductions,
        net,
        slipId
      ]);
    } else {
      const [insRes] = await pool.query(`
        INSERT INTO payslips 
        (payrun_id, employee_id, contract_id, period_start, period_end, scheduled_work_days, worked_days, unpaid_leave_days, gross_salary, total_deductions, net_salary, status, delivery_status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, 'PAID', 'SENT', NOW())
      `, [
        sepPayrunId,
        emp.id,
        emp.contract_id,
        effectiveStart,
        effectiveEnd,
        scheduledDays,
        workedDays,
        gross,
        deductions,
        net
      ]);
      slipId = insRes.insertId;
    }

    // Rebuild line items
    await pool.query('DELETE FROM payslip_lines WHERE payslip_id = ?', [slipId]);

    const lines = [
      { code: 'BASIC', name: 'Basic Salary', cat: 'BASIC', seq: 1, rate: 50.0, amt: basic },
      { code: 'HRA', name: 'House Rent Allowance (HRA)', cat: 'ALLOWANCE', seq: 2, rate: 20.0, amt: hra },
      { code: 'SPL_ALW', name: 'Special Company Allowance', cat: 'ALLOWANCE', seq: 3, rate: 15.0, amt: splAllowance },
      { code: 'GROSS', name: 'Gross Salary', cat: 'GROSS', seq: 4, rate: null, amt: gross },
      { code: 'PF_DED', name: 'Provident Fund (PF - 12%)', cat: 'DEDUCTION', seq: 5, rate: 12.0, amt: pf },
      { code: 'TDS_TAX', name: 'Tax Deducted at Source (TDS)', cat: 'DEDUCTION', seq: 6, rate: 5.0, amt: tds },
      { code: 'NET', name: 'Net Take-Home Salary Payable', cat: 'NET', seq: 7, rate: null, amt: net }
    ];

    for (const l of lines) {
      await pool.query(`
        INSERT INTO payslip_lines 
        (payslip_id, rule_code, rule_name, category, sequence, rate_or_percentage, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [slipId, l.code, l.name, l.cat, l.seq, l.rate, l.amt]);
    }

    batchGross += gross;
    batchDeductions += deductions;
    batchNet += net;
    syncedSlips++;

    if (emp.first_name === 'seeta' || emp.first_name === 'Rohan' && emp.last_name === 'Trivedi' || emp.first_name === 'Alex' && emp.last_name === 'Morgan') {
      console.log(`→ Verified ${emp.first_name} ${emp.last_name} (${emp.employee_code}): Contract Wage ₹${wage.toLocaleString('en-IN')}, Period: ${effectiveStart} to ${effectiveEnd}, Worked: ${workedDays} days (${workedHours} hrs), Net: ₹${net.toLocaleString('en-IN')}`);
    }
  }

  // 5. Update September Payrun Summary
  await pool.query(`
    UPDATE payruns 
    SET total_employees = ?, total_gross = ?, total_deductions = ?, total_net = ?, status = 'PAID', validated_at = NOW(), paid_at = NOW()
    WHERE id = ?
  `, [syncedSlips, batchGross, batchDeductions, batchNet, sepPayrunId]);

  console.log(`\n✓ Successfully synced ${syncedSlips} payslips.`);
  console.log(`Total September Gross: ₹${batchGross.toLocaleString('en-IN')}`);
  console.log(`Total September Net: ₹${batchNet.toLocaleString('en-IN')}`);
  console.log('\n=== Contract & Attendance Synchronization Complete ===');
  process.exit(0);
}

sync().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});

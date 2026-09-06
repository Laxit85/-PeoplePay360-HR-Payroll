const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  console.log('=== Starting 200+ Comprehensive Entity Seeder for PeoplePay360 ===\n');

  // 1. Departments
  const deptDefs = [
    { name: 'Engineering', code: 'ENG' },
    { name: 'Product & Design', code: 'PRD' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance & Operations', code: 'FIN' },
    { name: 'Marketing & Growth', code: 'MKT' },
    { name: 'Customer Experience', code: 'CX' },
    { name: 'Legal & Compliance', code: 'LGL' },
    { name: 'Data & Artificial Intelligence', code: 'DAI' },
  ];

  const deptIds = [];
  for (const d of deptDefs) {
    const [existing] = await pool.query('SELECT id FROM departments WHERE code = ? OR name = ?', [d.code, d.name]);
    if (existing.length > 0) {
      deptIds.push(existing[0].id);
    } else {
      const [res] = await pool.query('INSERT INTO departments (name, code) VALUES (?, ?)', [d.name, d.code]);
      deptIds.push(res.insertId);
    }
  }
  console.log(`✓ Departments verified (${deptIds.length} departments available)`);

  // 2. Job Positions
  const jobDefs = [
    { title: 'Lead Software Architect', deptIndex: 0 },
    { title: 'Senior Backend Engineer', deptIndex: 0 },
    { title: 'Fullstack Developer', deptIndex: 0 },
    { title: 'DevOps & Cloud Engineer', deptIndex: 0 },
    { title: 'Principal Product Manager', deptIndex: 1 },
    { title: 'Senior UI/UX Designer', deptIndex: 1 },
    { title: 'Product Operations Analyst', deptIndex: 1 },
    { title: 'Head of People & Culture', deptIndex: 2 },
    { title: 'HR Generalist & Talent Partner', deptIndex: 2 },
    { title: 'Payroll Operations Specialist', deptIndex: 3 },
    { title: 'Senior Financial Analyst', deptIndex: 3 },
    { title: 'Growth Marketing Lead', deptIndex: 4 },
    { title: 'Content & Brand Strategist', deptIndex: 4 },
    { title: 'Customer Support Lead', deptIndex: 5 },
    { title: 'Client Success Manager', deptIndex: 5 },
    { title: 'Legal Counsel & Risk Analyst', deptIndex: 6 },
    { title: 'AI & Machine Learning Engineer', deptIndex: 7 },
    { title: 'Senior Data Scientist', deptIndex: 7 },
  ];

  const jobIds = [];
  for (const j of jobDefs) {
    const dId = deptIds[j.deptIndex % deptIds.length];
    const [existing] = await pool.query('SELECT id FROM job_positions WHERE title = ?', [j.title]);
    if (existing.length > 0) {
      jobIds.push(existing[0].id);
    } else {
      const [res] = await pool.query('INSERT INTO job_positions (title, department_id) VALUES (?, ?)', [j.title, dId]);
      jobIds.push(res.insertId);
    }
  }
  console.log(`✓ Job Positions verified (${jobIds.length} positions available)`);

  // 3. Working Schedule
  let scheduleId = 1;
  const [schedRows] = await pool.query('SELECT id FROM working_schedules LIMIT 1');
  if (schedRows.length > 0) {
    scheduleId = schedRows[0].id;
  } else {
    const [sRes] = await pool.query(
      'INSERT INTO working_schedules (name, hours_per_week) VALUES ("Standard 40h Regular Shift", 40.00)'
    );
    scheduleId = sRes.insertId;
  }

  // 4. Time Off Types
  const timeOffTypes = [
    { name: 'Paid Vacation', code: 'VACATION', unit: 'DAYS', requires_allocation: 1, is_unpaid: 0 },
    { name: 'Sick & Medical Leave', code: 'SICK', unit: 'DAYS', requires_allocation: 1, is_unpaid: 0 },
    { name: 'Casual Personal Leave', code: 'CASUAL', unit: 'DAYS', requires_allocation: 1, is_unpaid: 0 },
  ];
  const timeOffTypeIds = [];
  for (const tot of timeOffTypes) {
    const [existing] = await pool.query('SELECT id FROM time_off_types WHERE code = ?', [tot.code]);
    if (existing.length > 0) {
      timeOffTypeIds.push(existing[0].id);
    } else {
      const [res] = await pool.query(
        'INSERT INTO time_off_types (name, code, unit, requires_allocation, is_unpaid) VALUES (?, ?, ?, ?, ?)',
        [tot.name, tot.code, tot.unit, tot.requires_allocation, tot.is_unpaid]
      );
      timeOffTypeIds.push(res.insertId);
    }
  }
  console.log(`✓ Time Off Types verified (${timeOffTypeIds.length} types available)`);

  // 5. Salary Structure & Rules
  let structureId = 1;
  const [structRows] = await pool.query('SELECT id FROM salary_structures LIMIT 1');
  if (structRows.length > 0) {
    structureId = structRows[0].id;
  } else {
    const [stRes] = await pool.query(
      'INSERT INTO salary_structures (name, code, description) VALUES ("Standard Executive & Staff Structure", "STD_2026", "Corporate monthly payroll compensation model")'
    );
    structureId = stRes.insertId;
  }

  // 6. Pre-computed Hash for Password@123
  const passwordHash = await bcrypt.hash('Password@123', 8);

  // 7. Generate 200 Employees & Users
  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Dhruv', 'Kabir', 'Rohan', 'Vikram', 'Rajesh', 'Suresh', 'Manish', 'Karan', 'Dev', 'Naveen',
    'Ananya', 'Diya', 'Pari', 'Saanvi', 'Myra', 'Aadhya', 'Aarohi', 'Pooja', 'Priya', 'Riya',
    'Kavya', 'Meera', 'Sneha', 'Shreya', 'Neha', 'Sunita', 'Tanvi', 'Isha', 'Simran', 'Swati'
  ];

  const lastNames = [
    'Sharma', 'Verma', 'Patel', 'Gupta', 'Iyer', 'Menon', 'Reddy', 'Chopra', 'Malhotra', 'Bhatia',
    'Joshi', 'Kulkarni', 'Deshmukh', 'Nair', 'Pillai', 'Rao', 'Das', 'Banerjee', 'Chatterjee', 'Sen',
    'Mehta', 'Shah', 'Agarwal', 'Mishra', 'Pandey', 'Dubey', 'Trivedi', 'Saxena', 'Kapoor', 'Khanna'
  ];

  const banks = [
    { name: 'HDFC Bank', ifsc: 'HDFC0001234' },
    { name: 'State Bank of India', ifsc: 'SBIN0005678' },
    { name: 'ICICI Bank', ifsc: 'ICIC0009012' },
    { name: 'Axis Bank', ifsc: 'UTIB0003456' },
    { name: 'Kotak Mahindra Bank', ifsc: 'KKBK0007890' }
  ];

  const employeeTypes = ['FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'];

  console.log('Seeding 200 Employees, Users, and Employment Contracts...');

  const createdEmployeeIds = [];
  const createdContractIds = [];
  const employeeWages = {};

  for (let i = 1; i <= 200; i++) {
    const fn = firstNames[(i * 3 + 7) % firstNames.length];
    const ln = lastNames[(i * 5 + 11) % lastNames.length];
    const empCode = `EMP-0${String(100 + i).padStart(4, '0')}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@peoplepay360.internal`;
    const phone = `+91 ${9800000000 + i * 137}`;
    const pan = `ABCDE${String(1000 + i)}F`;
    const bank = banks[i % banks.length];
    const bankAcc = `50100${String(20000000 + i * 47).padStart(9, '0')}`;
    const dId = deptIds[i % deptIds.length];
    const jId = jobIds[i % jobIds.length];
    const empType = employeeTypes[i % employeeTypes.length];
    const empStatus = i % 25 === 0 ? 'PROBATION' : 'ACTIVE';

    // 7A. Create / Get User
    let userId = null;
    const [userExisting] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (userExisting.length > 0) {
      userId = userExisting[0].id;
    } else {
      const [uRes] = await pool.query(
        'INSERT INTO users (email, password_hash, role_id, is_active) VALUES (?, ?, 5, 1)',
        [email, passwordHash]
      );
      userId = uRes.insertId;
    }

    // 7B. Create / Get Employee
    let empId = null;
    const [empExisting] = await pool.query('SELECT id FROM employees WHERE employee_code = ? OR email = ?', [empCode, email]);
    if (empExisting.length > 0) {
      empId = empExisting[0].id;
    } else {
      const [eRes] = await pool.query(`
        INSERT INTO employees 
        (user_id, employee_code, first_name, last_name, email, phone, department_id, job_position_id, working_schedule_id, employee_type, employment_status, joining_date, bank_name, bank_account_no, bank_ifsc_or_routing, tax_id_or_pan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2025-06-01', ?, ?, ?, ?)
      `, [userId, empCode, fn, ln, email, phone, dId, jId, scheduleId, empType, empStatus, bank.name, bankAcc, bank.ifsc, pan]);
      empId = eRes.insertId;
    }
    createdEmployeeIds.push(empId);

    // 7C. Create Active Contract with Realistic Salary in Rupees (₹35,000 to ₹1,75,000)
    // Base wages: tiered by index
    let wage = 38000;
    if (i <= 15) wage = 145000 + (i * 2000); // Leadership
    else if (i <= 60) wage = 85000 + (i * 650); // Senior engineers & managers
    else if (i <= 140) wage = 55000 + (i * 350); // Mid-level
    else if (i <= 185) wage = 42000 + (i * 200); // Associates
    else wage = 32000 + (i * 150); // Interns / Contractors

    wage = Math.round(wage / 500) * 500; // Round to nearest ₹500
    employeeWages[empId] = wage;

    const [cntExisting] = await pool.query('SELECT id FROM contracts WHERE employee_id = ? AND status = "ACTIVE"', [empId]);
    if (cntExisting.length > 0) {
      createdContractIds.push(cntExisting[0].id);
    } else {
      const [cRes] = await pool.query(`
        INSERT INTO contracts
        (employee_id, salary_structure_id, working_schedule_id, reference_name, wage, wage_type, start_date, status)
        VALUES (?, ?, ?, ?, ?, 'MONTHLY', '2025-06-01', 'ACTIVE')
      `, [empId, structureId, scheduleId, `${fn} ${ln} - Corporate Employment Agreement`, wage]);
      createdContractIds.push(cRes.insertId);
    }
  }
  console.log(`✓ 200 Employees, Users, and Contracts successfully synced!`);

  // 8. Time Off Allocations (18 Vacation, 12 Sick, 10 Casual)
  console.log('Seeding Time Off Allocations for all employees...');
  for (const empId of createdEmployeeIds) {
    for (let tIdx = 0; tIdx < timeOffTypeIds.length; tIdx++) {
      const typeId = timeOffTypeIds[tIdx];
      const allocDays = tIdx === 0 ? 18.00 : tIdx === 1 ? 12.00 : 10.00;
      const [existingAlloc] = await pool.query(
        'SELECT id FROM time_off_allocations WHERE employee_id = ? AND time_off_type_id = ?',
        [empId, typeId]
      );
      if (existingAlloc.length === 0) {
        await pool.query(`
          INSERT INTO time_off_allocations 
          (employee_id, time_off_type_id, allocated_days, taken_days, remaining_days, valid_from, valid_to, status, approved_by_user_id)
          VALUES (?, ?, ?, 0.00, ?, '2026-01-01', '2026-12-31', 'APPROVED', 1)
        `, [empId, typeId, allocDays, allocDays]);
      }
    }
  }
  console.log(`✓ Time Off Allocations active for all employees`);

  // 9. Generate 200 Time Off Requests
  console.log('Seeding 200 Time Off Requests across employees...');
  const leaveReasons = [
    'Annual Family Vacation', 'Attending Family Function', 'Viral Fever & Medical Rest',
    'Personal Emergency', 'Doctor Appointment & Tests', 'Relocation & Home Shifting',
    'Parental Care', 'Festival Celebration with Family', 'Health Recuperation'
  ];

  const leaveStatuses = ['APPROVED', 'APPROVED', 'APPROVED', 'SUBMITTED', 'REFUSED'];

  for (let r = 1; r <= 200; r++) {
    const empId = createdEmployeeIds[r % createdEmployeeIds.length];
    const typeId = timeOffTypeIds[r % timeOffTypeIds.length];
    const status = leaveStatuses[r % leaveStatuses.length];
    const day = 1 + (r % 25);
    const month = r % 2 === 0 ? '08' : '09';
    const dateFrom = `2026-${month}-${String(day).padStart(2, '0')}`;
    const dateTo = `2026-${month}-${String(Math.min(28, day + (r % 3))).padStart(2, '0')}`;
    const duration = 1 + (r % 3);
    const reason = leaveReasons[r % leaveReasons.length];

    const [existingReq] = await pool.query(
      'SELECT id FROM time_off_requests WHERE employee_id = ? AND date_from = ?',
      [empId, dateFrom]
    );
    if (existingReq.length === 0) {
      await pool.query(`
        INSERT INTO time_off_requests 
        (employee_id, time_off_type_id, date_from, date_to, duration, reason, status, approved_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [empId, typeId, dateFrom, dateTo, duration, reason, status, status === 'APPROVED' ? 1 : null]);
    }
  }
  console.log(`✓ 200 Time Off Requests verified`);

  // 10. Generate 300+ Attendance Logs for September 2026
  console.log('Seeding 300+ Attendance Logs for September 2026...');
  const attStatuses = ['ON_TIME', 'ON_TIME', 'ON_TIME', 'ON_TIME', 'LATE', 'OVERTIME'];

  for (let a = 1; a <= 300; a++) {
    const empId = createdEmployeeIds[a % createdEmployeeIds.length];
    const day = 1 + (a % 28);
    const attDate = `2026-09-${String(day).padStart(2, '0')}`;
    const status = attStatuses[a % attStatuses.length];
    const inHour = status === 'LATE' ? '09:45:00' : '09:00:00';
    const outHour = status === 'OVERTIME' ? '19:30:00' : '18:00:00';
    const worked = status === 'OVERTIME' ? 9.50 : status === 'LATE' ? 7.25 : 8.00;
    const ot = status === 'OVERTIME' ? 1.50 : 0.00;

    const [existingAtt] = await pool.query(
      'SELECT id FROM attendances WHERE employee_id = ? AND attendance_date = ?',
      [empId, attDate]
    );
    if (existingAtt.length === 0) {
      await pool.query(`
        INSERT INTO attendances 
        (employee_id, attendance_date, check_in, check_out, planned_hours, worked_hours, overtime_hours, status)
        VALUES (?, ?, ?, ?, 8.00, ?, ?, ?)
      `, [empId, attDate, `${attDate} ${inHour}`, `${attDate} ${outHour}`, worked, ot, status]);
    }
  }
  console.log(`✓ 300+ Attendance records recorded`);

  // 11. Pay Runs: September 2026 and August 2026
  console.log('Seeding / Verifying Pay Runs for September and August 2026...');
  
  // Payrun 1: September 2026
  let sepPayrunId = 1;
  const [sepPr] = await pool.query('SELECT id FROM payruns WHERE period_start = "2026-08-31" OR period_start = "2026-09-01"');
  if (sepPr.length > 0) {
    sepPayrunId = sepPr[0].id;
  } else {
    const [pRes] = await pool.query(`
      INSERT INTO payruns 
      (name, period_start, period_end, salary_structure_id, status, created_by_user_id)
      VALUES ('September 2026 Regular Payrun', '2026-09-01', '2026-09-30', ?, 'PAID', 1)
    `, [structureId]);
    sepPayrunId = pRes.insertId;
  }

  // Payrun 2: August 2026
  let augPayrunId = 2;
  const [augPr] = await pool.query('SELECT id FROM payruns WHERE period_start = "2026-08-01"');
  if (augPr.length > 0) {
    augPayrunId = augPr[0].id;
  } else {
    const [pRes2] = await pool.query(`
      INSERT INTO payruns 
      (name, period_start, period_end, salary_structure_id, status, created_by_user_id)
      VALUES ('August 2026 Corporate Payrun', '2026-08-01', '2026-08-31', ?, 'PAID', 1)
    `, [structureId]);
    augPayrunId = pRes2.insertId;
  }

  // 12. Generate 200+ Payslips & Payslip Lines across September and August
  console.log('Generating 200+ Payslips and Payslip Lines in Indian Rupees...');

  let sepGrossTotal = 0;
  let sepNetTotal = 0;
  let sepDedTotal = 0;
  let sepCount = 0;

  for (let p = 0; p < createdEmployeeIds.length; p++) {
    const empId = createdEmployeeIds[p];
    const contractId = createdContractIds[p];
    const wage = employeeWages[empId] || 50000;

    // Component breakdown:
    // Basic: 50%
    const basic = Math.round(wage * 0.50);
    // HRA: 20%
    const hra = Math.round(wage * 0.20);
    // Special Allowance: 15%
    const splAllowance = Math.round(wage * 0.15);
    // Gross: Basic + HRA + Spl = 85% of full package
    const gross = basic + hra + splAllowance;
    // PF Deduction: 12% of Basic
    const pf = Math.round(basic * 0.12);
    // TDS / Tax: ~5% of Gross
    const tds = Math.round(gross * 0.05);
    const deductions = pf + tds;
    const net = gross - deductions;

    // A. September 2026 Payslip (all 200 employees)
    const [existingSepSlip] = await pool.query(
      'SELECT id FROM payslips WHERE payrun_id = ? AND employee_id = ?',
      [sepPayrunId, empId]
    );

    let slipId = null;
    if (existingSepSlip.length > 0) {
      slipId = existingSepSlip[0].id;
    } else {
      const [psRes] = await pool.query(`
        INSERT INTO payslips 
        (payrun_id, employee_id, contract_id, period_start, period_end, scheduled_work_days, worked_days, unpaid_leave_days, gross_salary, total_deductions, net_salary, status, delivery_status, sent_at)
        VALUES (?, ?, ?, '2026-09-01', '2026-09-30', 22.0, 22.0, 0.0, ?, ?, ?, 'PAID', 'SENT', '2026-09-05 18:00:00')
      `, [sepPayrunId, empId, contractId, gross, deductions, net]);
      slipId = psRes.insertId;

      // Lines for September
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
    }

    sepGrossTotal += gross;
    sepNetTotal += net;
    sepDedTotal += deductions;
    sepCount++;

    // B. August 2026 Payslip for first 60 employees
    if (p < 60) {
      const [existingAugSlip] = await pool.query(
        'SELECT id FROM payslips WHERE payrun_id = ? AND employee_id = ?',
        [augPayrunId, empId]
      );
      if (existingAugSlip.length === 0) {
        const [psRes2] = await pool.query(`
          INSERT INTO payslips 
          (payrun_id, employee_id, contract_id, period_start, period_end, scheduled_work_days, worked_days, unpaid_leave_days, gross_salary, total_deductions, net_salary, status, delivery_status, sent_at)
          VALUES (?, ?, ?, '2026-08-01', '2026-08-31', 22.0, 22.0, 0.0, ?, ?, ?, 'PAID', 'SENT', '2026-08-31 18:00:00')
        `, [augPayrunId, empId, contractId, gross, deductions, net]);

        const aSlipId = psRes2.insertId;
        const linesAug = [
          { code: 'BASIC', name: 'Basic Salary', cat: 'BASIC', seq: 1, amt: basic },
          { code: 'HRA', name: 'House Rent Allowance', cat: 'ALLOWANCE', seq: 2, amt: hra },
          { code: 'PF_DED', name: 'Provident Fund', cat: 'DEDUCTION', seq: 3, amt: pf },
          { code: 'NET', name: 'Net Salary', cat: 'NET', seq: 4, amt: net }
        ];
        for (const la of linesAug) {
          await pool.query(
            'INSERT INTO payslip_lines (payslip_id, rule_code, rule_name, category, sequence, amount) VALUES (?, ?, ?, ?, ?, ?)',
            [aSlipId, la.code, la.name, la.cat, la.seq, la.amt]
          );
        }
      }
    }
  }

  // Update September Payrun aggregate stats
  await pool.query(`
    UPDATE payruns 
    SET total_employees = ?, total_gross = ?, total_deductions = ?, total_net = ?, status = 'PAID', validated_at = NOW(), paid_at = NOW()
    WHERE id = ?
  `, [sepCount, sepGrossTotal, sepDedTotal, sepNetTotal, sepPayrunId]);

  console.log(`✓ 200+ Payslips generated! September Total Net Disbursed: ₹${Number(sepNetTotal).toLocaleString('en-IN')}`);

  // 13. Generate 25 Realistic Payroll Warnings
  console.log('Seeding 25 Payroll Warnings for system alerts...');
  const warningMessages = [
    'Employee has unverified PAN / Tax Identification document.',
    'Overtime hours flagged for managerial review (> 10h/week).',
    'Bank account routing IFSC code pending validation.',
    'Employment probation period ending within next 15 days.',
    'Contract renewal scheduled for upcoming quarter.',
    'Consecutive medical leaves submitted without doctor certificate.'
  ];

  for (let w = 1; w <= 25; w++) {
    const empId = createdEmployeeIds[w * 7 % createdEmployeeIds.length];
    const msg = warningMessages[w % warningMessages.length];
    const [existingW] = await pool.query('SELECT id FROM payroll_warnings WHERE employee_id = ? AND message = ?', [empId, msg]);
    if (existingW.length === 0) {
      await pool.query(`
        INSERT INTO payroll_warnings 
        (payrun_id, employee_id, warning_type, severity, message, is_resolved)
        VALUES (?, ?, 'MISSING_BANK_ACCOUNT', 'WARNING', ?, 0)
      `, [sepPayrunId, empId, msg]);
    }
  }
  console.log(`✓ Payroll Warnings active`);

  console.log('\n======================================================');
  console.log('✓ 200+ Comprehensive Data Population Completed Successfully!');
  console.log('======================================================\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

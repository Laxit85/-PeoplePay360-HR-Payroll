require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seedDatabase() {
  console.log('====================================================');
  console.log(' PeoplePay360 : XAMPP MySQL Database Seeder');
  console.log('====================================================');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'peoplepay360',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    multipleStatements: true
  });

  try {
    console.log(' Connected to MySQL database `peoplepay360`...');

    // Clear existing data in reverse order of foreign keys
    console.log(' Cleaning old tables for fresh seed...');
    await connection.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      TRUNCATE TABLE payroll_warnings;
      TRUNCATE TABLE payslip_lines;
      TRUNCATE TABLE payslips;
      TRUNCATE TABLE payruns;
      TRUNCATE TABLE time_off_requests;
      TRUNCATE TABLE time_off_allocations;
      TRUNCATE TABLE time_off_types;
      TRUNCATE TABLE attendances;
      TRUNCATE TABLE contracts;
      TRUNCATE TABLE salary_rules;
      TRUNCATE TABLE salary_structures;
      TRUNCATE TABLE schedule_lines;
      TRUNCATE TABLE working_schedules;
      TRUNCATE TABLE employees;
      TRUNCATE TABLE job_positions;
      TRUNCATE TABLE departments;
      TRUNCATE TABLE users;
      SET FOREIGN_KEY_CHECKS = 1;
    `);

    // 1. Roles Check
    console.log(' Seeding roles...');
    await connection.query(`
      INSERT IGNORE INTO roles (id, name, description) VALUES
      (1, 'ADMIN', 'Complete system administrator'),
      (2, 'HR_MANAGER', 'Full HR master data, schedules, attendance, and leave management'),
      (3, 'HR_PAYROLL_USER', 'Payrun and payslip generation and review'),
      (4, 'HR_PAYROLL_MANAGER', 'Full control over payroll batches, validation, and salary structures'),
      (5, 'EMPLOYEE', 'Self-service employee access');
    `);

    // 2. Users
    console.log(' Seeding default users...');
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const hrPass = await bcrypt.hash('manager123', salt);
    const payrollPass = await bcrypt.hash('payroll123', salt);
    const empPass = await bcrypt.hash('employee123', salt);

    await connection.execute(`
      INSERT INTO users (id, email, password_hash, role_id) VALUES
      (1, 'admin@peoplepay360.internal', '${adminPass}', 1),
      (2, 'hr.manager@peoplepay360.internal', '${hrPass}', 2),
      (3, 'payroll.manager@peoplepay360.internal', '${payrollPass}', 4),
      (4, 'alex.morgan@peoplepay360.internal', '${empPass}', 5);
    `);

    // 3. Departments & Job Positions
    console.log(' Seeding departments and positions...');
    await connection.query(`
      INSERT INTO departments (id, name, code) VALUES
      (1, 'Engineering', 'ENG'),
      (2, 'Product & Design', 'PRD'),
      (3, 'Human Resources', 'HR'),
      (4, 'Finance & Operations', 'FIN');

      INSERT INTO job_positions (id, title, department_id) VALUES
      (1, 'Lead Software Architect', 1),
      (2, 'Senior Fullstack Engineer', 1),
      (3, 'Product Manager', 2),
      (4, 'HR Operations Lead', 3),
      (5, 'Payroll Specialist', 4);
    `);

    // 4. Working Schedule & Shift Lines
    console.log(' Seeding working schedules...');
    await connection.execute(`
      INSERT INTO working_schedules (id, name, type, total_weekly_hours) VALUES
      (1, 'Standard 40h (Mon-Fri 09:00-17:00)', 'STANDARD', 35.00);
    `);

    await connection.query(`
      INSERT INTO schedule_lines (schedule_id, day_of_week, work_type, start_time, end_time, break_hours, work_hours) VALUES
      (1, 'MONDAY', 'WORKDAY', '09:00:00', '17:00:00', 1.00, 7.00),
      (1, 'TUESDAY', 'WORKDAY', '09:00:00', '17:00:00', 1.00, 7.00),
      (1, 'WEDNESDAY', 'WORKDAY', '09:00:00', '17:00:00', 1.00, 7.00),
      (1, 'THURSDAY', 'WORKDAY', '09:00:00', '17:00:00', 1.00, 7.00),
      (1, 'FRIDAY', 'WORKDAY', '09:00:00', '17:00:00', 1.00, 7.00),
      (1, 'SATURDAY', 'WEEKEND', '00:00:00', '00:00:00', 0.00, 0.00),
      (1, 'SUNDAY', 'WEEKEND', '00:00:00', '00:00:00', 0.00, 0.00);
    `);

    // 5. Time Off Types
    console.log(' Seeding time off types...');
    await connection.query(`
      INSERT INTO time_off_types (id, name, code, unit, requires_allocation, is_unpaid) VALUES
      (1, 'Paid Annual Leave', 'PTO', 'DAYS', 1, 0),
      (2, 'Sick Leave', 'SICK', 'DAYS', 1, 0),
      (3, 'Unpaid Leave (Leave Without Pay)', 'UNPAID', 'DAYS', 0, 1);
    `);

    // 6. Salary Structures & Sequenced Rules
    console.log(' Seeding salary structures and sequenced rules...');
    await connection.execute(`
      INSERT INTO salary_structures (id, name, code, description) VALUES
      (1, 'Standard Corporate Salaried Structure', 'STD_CORP_SAL', 'Standard monthly salary with Basic, HRA, Allowances, PF, and Tax');
    `);

    await connection.query(`
      INSERT INTO salary_rules (structure_id, name, code, category, sequence, computation_type, percentage_base_code, percentage_rate, formula_expression) VALUES
      (1, 'Basic Salary', 'BASIC', 'BASIC', 10, 'PERCENTAGE', 'WAGE', 50.000, NULL),
      (1, 'House Rent Allowance (HRA)', 'HRA', 'ALLOWANCE', 20, 'PERCENTAGE', 'BASIC', 40.000, NULL),
      (1, 'Special Allowance', 'SPECIAL_ALLOWANCE', 'ALLOWANCE', 30, 'PERCENTAGE', 'BASIC', 20.000, NULL),
      (1, 'Gross Salary', 'GROSS', 'GROSS', 100, 'FORMULA', NULL, NULL, 'BASIC + GROSS'),
      (1, 'Provident Fund (PF)', 'PF', 'DEDUCTION', 200, 'PERCENTAGE', 'BASIC', 12.000, NULL),
      (1, 'Professional & Income Tax', 'TAX', 'DEDUCTION', 210, 'PERCENTAGE', 'GROSS', 8.000, NULL),
      (1, 'Net Take-Home Salary', 'NET', 'NET', 999, 'FORMULA', NULL, NULL, 'GROSS - DEDUCTIONS');
    `);

    // 7. Employees
    console.log(' Seeding employees...');
    await connection.query(`
      INSERT INTO employees (id, employee_code, first_name, last_name, email, phone, department_id, job_position_id, working_schedule_id, employee_type, employment_status, joining_date, bank_name, bank_account_no, bank_ifsc_or_routing, tax_id_or_pan, user_id) VALUES
      (1, 'EMP-00101', 'Alex', 'Morgan', 'alex.morgan@peoplepay360.internal', '+1 (555) 234-5678', 1, 1, 1, 'FULL_TIME', 'ACTIVE', '2024-01-15', 'JPMorgan Chase', '9876543210', 'CHASUS33', 'TX-88392-A', 4),
      (2, 'EMP-00102', 'Sarah', 'Chen', 'sarah.chen@peoplepay360.internal', '+1 (555) 345-6789', 1, 2, 1, 'FULL_TIME', 'ACTIVE', '2024-03-01', 'Bank of America', '4455667788', 'BOFAUS3N', 'TX-44912-B', NULL),
      (3, 'EMP-00103', 'Marcus', 'Vance', 'marcus.vance@peoplepay360.internal', '+1 (555) 456-7890', 2, 3, 1, 'FULL_TIME', 'ACTIVE', '2024-05-10', 'Wells Fargo', '1122334455', 'WFBIUS6S', 'TX-55102-C', NULL),
      (4, 'EMP-00104', 'Elena', 'Rostova', 'elena.rostova@peoplepay360.internal', '+1 (555) 567-8901', 3, 4, 1, 'FULL_TIME', 'ACTIVE', '2024-02-01', 'Citibank', '6677889900', 'CITIUS33', 'TX-10293-D', 2),
      (5, 'EMP-00105', 'David', 'Kim', 'david.kim@peoplepay360.internal', '+1 (555) 678-9012', 4, 5, 1, 'FULL_TIME', 'ACTIVE', '2024-04-15', '', '', '', 'TX-99012-E', 3);
    `);

    // Assign Department Managers
    await connection.query(`
      UPDATE departments SET manager_id = 1 WHERE id = 1;
      UPDATE departments SET manager_id = 3 WHERE id = 2;
      UPDATE departments SET manager_id = 4 WHERE id = 3;
      UPDATE departments SET manager_id = 5 WHERE id = 4;
    `);

    // 8. Contracts (Active period contracts)
    console.log(' Seeding active contracts...');
    await connection.query(`
      INSERT INTO contracts (employee_id, reference_name, salary_structure_id, working_schedule_id, wage, wage_type, start_date, status) VALUES
      (1, 'Alex Morgan - 2026 Executive Agreement', 1, 1, 9500.00, 'MONTHLY', '2026-01-01', 'ACTIVE'),
      (2, 'Sarah Chen - Senior Dev Contract', 1, 1, 8200.00, 'MONTHLY', '2026-01-01', 'ACTIVE'),
      (3, 'Marcus Vance - Product Agreement', 1, 1, 7800.00, 'MONTHLY', '2026-01-01', 'ACTIVE'),
      (4, 'Elena Rostova - HR Lead Agreement', 1, 1, 7000.00, 'MONTHLY', '2026-01-01', 'ACTIVE'),
      (5, 'David Kim - Payroll Lead Agreement', 1, 1, 6500.00, 'MONTHLY', '2026-01-01', 'ACTIVE');
    `);

    // 9. Leave Allocations
    console.log(' Seeding leave quotas...');
    await connection.query(`
      INSERT INTO time_off_allocations (employee_id, time_off_type_id, allocated_days, taken_days, remaining_days, valid_from, valid_to, status, approved_by_user_id) VALUES
      (1, 1, 20.00, 2.00, 18.00, '2026-01-01', '2026-12-31', 'APPROVED', 2),
      (1, 2, 10.00, 0.00, 10.00, '2026-01-01', '2026-12-31', 'APPROVED', 2),
      (2, 1, 20.00, 0.00, 20.00, '2026-01-01', '2026-12-31', 'APPROVED', 2),
      (3, 1, 20.00, 0.00, 20.00, '2026-01-01', '2026-12-31', 'APPROVED', 2),
      (4, 1, 20.00, 1.00, 19.00, '2026-01-01', '2026-12-31', 'APPROVED', 2),
      (5, 1, 20.00, 0.00, 20.00, '2026-01-01', '2026-12-31', 'APPROVED', 2);
    `);

    // 10. Sample Attendance records
    console.log(' Seeding attendance records...');
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');

    for (let day = 1; day <= 5; day++) {
      const dayStr = String(day).padStart(2, '0');
      await connection.query(`
        INSERT INTO attendances (employee_id, attendance_date, check_in, check_out, planned_hours, worked_hours, status) VALUES
        (1, '${curYear}-${curMonth}-${dayStr}', '${curYear}-${curMonth}-${dayStr} 09:00:00', '${curYear}-${curMonth}-${dayStr} 17:00:00', 8.00, 7.00, 'ON_TIME'),
        (2, '${curYear}-${curMonth}-${dayStr}', '${curYear}-${curMonth}-${dayStr} 08:55:00', '${curYear}-${curMonth}-${dayStr} 17:05:00', 8.00, 7.16, 'ON_TIME'),
        (3, '${curYear}-${curMonth}-${dayStr}', '${curYear}-${curMonth}-${dayStr} 09:02:00', '${curYear}-${curMonth}-${dayStr} 17:00:00', 8.00, 7.00, 'ON_TIME'),
        (4, '${curYear}-${curMonth}-${dayStr}', '${curYear}-${curMonth}-${dayStr} 09:00:00', '${curYear}-${curMonth}-${dayStr} 17:00:00', 8.00, 7.00, 'ON_TIME'),
        (5, '${curYear}-${curMonth}-${dayStr}', '${curYear}-${curMonth}-${dayStr} 09:30:00', '${curYear}-${curMonth}-${dayStr} 17:00:00', 8.00, 6.50, 'LATE');
      `);
    }

    console.log('\n====================================================');
    console.log(' SUCCESS! Realistic test data seeded into XAMPP MySQL.');
    console.log(' Default Users:');
    console.log('   Admin: admin@peoplepay360.internal / admin123');
    console.log('   HR Manager: hr.manager@peoplepay360.internal / manager123');
    console.log('   Payroll Manager: payroll.manager@peoplepay360.internal / payroll123');
    console.log('   Employee: alex.morgan@peoplepay360.internal / employee123');
    console.log('====================================================');

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ SEED ERROR:', err.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

seedDatabase();

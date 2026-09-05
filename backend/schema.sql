-- ==========================================================
-- PeoplePay360: Integrated HR & Payroll Operations Platform
-- Database Schema for XAMPP (MySQL / MariaDB)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `peoplepay360` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `peoplepay360`;

-- 1. ROLES TABLE (RBAC)
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert Standard RBAC Roles
INSERT IGNORE INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'ADMIN', 'Complete administrative control over all modules'),
(2, 'HR_MANAGER', 'Full CRUD on Employees, Attendance, Contracts, Schedules, Time Off'),
(3, 'HR_PAYROLL_USER', 'Access to Payrun and Payslips, read-only structures'),
(4, 'HR_PAYROLL_MANAGER', 'Full CRUD on Payruns, Payslips, Salary Structures & Rules'),
(5, 'EMPLOYEE', 'Self-service view for profile, attendance clocking, leave requests');

-- 2. USERS TABLE (System Authentication)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `manager_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. JOB POSITIONS TABLE
CREATE TABLE IF NOT EXISTS `job_positions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(100) NOT NULL,
  `department_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. WORKING SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS `working_schedules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('STANDARD', 'FLEXIBLE', 'SHIFT_BASED') DEFAULT 'STANDARD',
  `total_weekly_hours` DECIMAL(5, 2) DEFAULT 0.00,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. SCHEDULE LINES TABLE (Daily Shift Patterns)
CREATE TABLE IF NOT EXISTS `schedule_lines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `schedule_id` INT NOT NULL,
  `day_of_week` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
  `work_type` ENUM('WORKDAY', 'WEEKEND') DEFAULT 'WORKDAY',
  `start_time` TIME NOT NULL DEFAULT '09:00:00',
  `end_time` TIME NOT NULL DEFAULT '17:00:00',
  `break_hours` DECIMAL(4, 2) DEFAULT 1.00,
  `work_hours` DECIMAL(4, 2) NOT NULL DEFAULT 7.00,
  FOREIGN KEY (`schedule_id`) REFERENCES `working_schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. EMPLOYEES TABLE (Central Master Hub)
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL UNIQUE,
  `employee_code` VARCHAR(50) NOT NULL UNIQUE,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `department_id` INT NOT NULL,
  `job_position_id` INT NOT NULL,
  `manager_id` INT NULL,
  `working_schedule_id` INT NULL,
  `employee_type` ENUM('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN') DEFAULT 'FULL_TIME',
  `employment_status` ENUM('PROBATION', 'ACTIVE', 'NOTICE_PERIOD', 'TERMINATED') DEFAULT 'ACTIVE',
  `joining_date` DATE NOT NULL,
  `bank_name` VARCHAR(100) NULL,
  `bank_account_no` VARCHAR(50) NULL,
  `bank_ifsc_or_routing` VARCHAR(50) NULL,
  `tax_id_or_pan` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`job_position_id`) REFERENCES `job_positions` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`working_schedule_id`) REFERENCES `working_schedules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Add manager foreign key to departments
ALTER TABLE `departments` 
ADD CONSTRAINT `fk_dept_manager` 
FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL;

-- 8. SALARY STRUCTURES TABLE
CREATE TABLE IF NOT EXISTS `salary_structures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. SALARY RULES TABLE (Sequenced Computation Engine)
CREATE TABLE IF NOT EXISTS `salary_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `structure_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `category` ENUM('BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET') NOT NULL,
  `sequence` INT NOT NULL,
  `computation_type` ENUM('FIXED', 'PERCENTAGE', 'FORMULA') NOT NULL,
  `percentage_base_code` VARCHAR(50) NULL,
  `percentage_rate` DECIMAL(6, 3) NULL,
  `fixed_amount` DECIMAL(12, 2) NULL,
  `formula_expression` TEXT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`structure_id`) REFERENCES `salary_structures` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. CONTRACTS TABLE (Historical & Period-Applicable)
CREATE TABLE IF NOT EXISTS `contracts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `reference_name` VARCHAR(100) NOT NULL,
  `salary_structure_id` INT NOT NULL,
  `working_schedule_id` INT NULL,
  `wage` DECIMAL(12, 2) NOT NULL,
  `wage_type` ENUM('MONTHLY', 'HOURLY') DEFAULT 'MONTHLY',
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED') DEFAULT 'DRAFT',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`salary_structure_id`) REFERENCES `salary_structures` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`working_schedule_id`) REFERENCES `working_schedules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. ATTENDANCES TABLE (Daily check-ins & exceptions)
CREATE TABLE IF NOT EXISTS `attendances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `attendance_date` DATE NOT NULL,
  `check_in` DATETIME NOT NULL,
  `check_out` DATETIME NULL,
  `planned_hours` DECIMAL(5, 2) DEFAULT 8.00,
  `worked_hours` DECIMAL(5, 2) DEFAULT 0.00,
  `overtime_hours` DECIMAL(5, 2) DEFAULT 0.00,
  `status` ENUM('ON_TIME', 'LATE', 'EARLY_EXIT', 'MISSING_CHECKOUT', 'OVERTIME') DEFAULT 'ON_TIME',
  `is_corrected` TINYINT(1) DEFAULT 0,
  `correction_reason` TEXT NULL,
  `corrected_by_user_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`corrected_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12. TIME OFF TYPES TABLE
CREATE TABLE IF NOT EXISTS `time_off_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `unit` ENUM('DAYS', 'HOURS') DEFAULT 'DAYS',
  `requires_allocation` TINYINT(1) DEFAULT 1,
  `is_unpaid` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 13. TIME OFF ALLOCATIONS TABLE (Quota tracking)
CREATE TABLE IF NOT EXISTS `time_off_allocations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `time_off_type_id` INT NOT NULL,
  `allocated_days` DECIMAL(5, 2) NOT NULL,
  `taken_days` DECIMAL(5, 2) DEFAULT 0.00,
  `remaining_days` DECIMAL(5, 2) NOT NULL,
  `valid_from` DATE NOT NULL,
  `valid_to` DATE NOT NULL,
  `status` ENUM('DRAFT', 'APPROVED', 'REFUSED') DEFAULT 'DRAFT',
  `approved_by_user_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`time_off_type_id`) REFERENCES `time_off_types` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 14. TIME OFF REQUESTS TABLE
CREATE TABLE IF NOT EXISTS `time_off_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `time_off_type_id` INT NOT NULL,
  `allocation_id` INT NULL,
  `date_from` DATE NOT NULL,
  `date_to` DATE NOT NULL,
  `duration` DECIMAL(5, 2) NOT NULL,
  `reason` TEXT NULL,
  `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REFUSED') DEFAULT 'SUBMITTED',
  `approved_by_user_id` INT NULL,
  `refusal_reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`time_off_type_id`) REFERENCES `time_off_types` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`allocation_id`) REFERENCES `time_off_allocations` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 15. PAYRUNS TABLE (Batch Processing)
CREATE TABLE IF NOT EXISTS `payruns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `salary_structure_id` INT NOT NULL,
  `status` ENUM('DRAFT', 'COMPUTED', 'VALIDATED', 'PAID') DEFAULT 'DRAFT',
  `total_employees` INT DEFAULT 0,
  `total_gross` DECIMAL(14, 2) DEFAULT 0.00,
  `total_deductions` DECIMAL(14, 2) DEFAULT 0.00,
  `total_net` DECIMAL(14, 2) DEFAULT 0.00,
  `warnings_count` INT DEFAULT 0,
  `created_by_user_id` INT NULL,
  `validated_at` DATETIME NULL,
  `paid_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`salary_structure_id`) REFERENCES `salary_structures` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 16. PAYSLIPS TABLE (Individual Employee Earnings)
CREATE TABLE IF NOT EXISTS `payslips` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payrun_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `contract_id` INT NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `scheduled_work_days` DECIMAL(4, 1) DEFAULT 0.0,
  `worked_days` DECIMAL(4, 1) DEFAULT 0.0,
  `unpaid_leave_days` DECIMAL(4, 1) DEFAULT 0.0,
  `gross_salary` DECIMAL(12, 2) DEFAULT 0.00,
  `total_deductions` DECIMAL(12, 2) DEFAULT 0.00,
  `net_salary` DECIMAL(12, 2) DEFAULT 0.00,
  `status` ENUM('DRAFT', 'COMPUTED', 'VALIDATED', 'PAID') DEFAULT 'DRAFT',
  `pdf_url` VARCHAR(500) NULL,
  `delivery_status` ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
  `sent_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_payslip_per_payrun` (`payrun_id`, `employee_id`),
  FOREIGN KEY (`payrun_id`) REFERENCES `payruns` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 17. PAYSLIP LINES TABLE (Itemized Salary Component Breakdown)
CREATE TABLE IF NOT EXISTS `payslip_lines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payslip_id` INT NOT NULL,
  `salary_rule_id` INT NULL,
  `rule_code` VARCHAR(50) NOT NULL,
  `rule_name` VARCHAR(100) NOT NULL,
  `category` ENUM('BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET') NOT NULL,
  `sequence` INT NOT NULL,
  `rate_or_percentage` DECIMAL(6, 3) NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`payslip_id`) REFERENCES `payslips` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`salary_rule_id`) REFERENCES `salary_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 18. PAYROLL WARNINGS TABLE (Pre-Validation Anomaly Audit)
CREATE TABLE IF NOT EXISTS `payroll_warnings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payrun_id` INT NOT NULL,
  `payslip_id` INT NULL,
  `employee_id` INT NOT NULL,
  `warning_type` ENUM('MISSING_BANK_ACCOUNT', 'DUPLICATE_PAYSLIP', 'NO_ACTIVE_CONTRACT', 'NEGATIVE_NET_SALARY', 'ATTENDANCE_ANOMALY') NOT NULL,
  `severity` ENUM('INFO', 'WARNING', 'CRITICAL') DEFAULT 'WARNING',
  `message` TEXT NOT NULL,
  `is_resolved` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`payrun_id`) REFERENCES `payruns` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`payslip_id`) REFERENCES `payslips` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

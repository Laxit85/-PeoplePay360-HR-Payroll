-- Owner: Person 1 (Auth)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','hr_manager','employee','payroll_officer') NOT NULL,
  employee_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

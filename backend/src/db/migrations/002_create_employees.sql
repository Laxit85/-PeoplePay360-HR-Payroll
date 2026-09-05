-- Owner: Person 2 (Employee)
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  status ENUM('active','inactive','terminated') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Now that employees exists, wire up the FK left pending from 001_create_users.sql
ALTER TABLE users
  ADD CONSTRAINT fk_users_employee
  FOREIGN KEY (employee_id) REFERENCES employees(id);

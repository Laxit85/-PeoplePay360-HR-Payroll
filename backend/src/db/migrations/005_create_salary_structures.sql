-- Owner: Person 4 (Payroll)
-- Created before `contracts` because contracts.salary_structure_id references it.
CREATE TABLE IF NOT EXISTS salary_structures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

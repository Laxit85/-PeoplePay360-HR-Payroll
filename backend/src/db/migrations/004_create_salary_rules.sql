-- Owner: Person 4 (Payroll)
CREATE TABLE IF NOT EXISTS salary_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  formula TEXT NOT NULL,
  sequence INT NOT NULL DEFAULT 10
);

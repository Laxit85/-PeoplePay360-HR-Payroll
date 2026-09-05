-- Owner: Person 4 (Payroll)
CREATE TABLE IF NOT EXISTS payruns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status ENUM('draft','computed','validated','paid','sent') DEFAULT 'draft'
);

-- Owner: Person 4 (Payroll)
CREATE TABLE IF NOT EXISTS payslips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payrun_id INT NOT NULL,
  employee_id INT NOT NULL,
  contract_id INT NULL,  -- NULL when computation failed before a contract could be resolved
  gross_pay DECIMAL(12,2),
  net_pay DECIMAL(12,2),
  computation_json JSON,
  status ENUM('pending','computed','failed','sent') DEFAULT 'pending',
  error_message TEXT NULL,
  FOREIGN KEY (payrun_id) REFERENCES payruns(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

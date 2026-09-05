-- Owner: Person 2 (Employee)
CREATE TABLE IF NOT EXISTS contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  wage DECIMAL(12,2) NOT NULL,
  salary_structure_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id)
);

-- Owner: Person 3 (Time Off)
CREATE TABLE IF NOT EXISTS time_off_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  time_off_type_id INT NOT NULL,
  allocated_days DECIMAL(5,2) NOT NULL,
  remaining_days DECIMAL(5,2) NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (time_off_type_id) REFERENCES time_off_types(id)
);

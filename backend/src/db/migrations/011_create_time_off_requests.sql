-- Owner: Person 3 (Time Off)
CREATE TABLE IF NOT EXISTS time_off_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  time_off_type_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('pending','approved','refused') DEFAULT 'pending',
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (time_off_type_id) REFERENCES time_off_types(id)
);

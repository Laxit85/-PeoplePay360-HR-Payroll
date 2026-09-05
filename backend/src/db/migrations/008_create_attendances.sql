-- Owner: Person 3 (Attendance)
CREATE TABLE IF NOT EXISTS attendances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  work_date DATE NOT NULL,
  check_in DATETIME,
  check_out DATETIME,
  status ENUM('on_time','late','overtime','missing_checkout') DEFAULT 'on_time',
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  UNIQUE KEY uq_employee_date (employee_id, work_date)
);

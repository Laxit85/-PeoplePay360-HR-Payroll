-- Owner: Person 2 (Employee)
CREATE TABLE IF NOT EXISTS working_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  monday_hours DECIMAL(4,2) DEFAULT 0,
  tuesday_hours DECIMAL(4,2) DEFAULT 0,
  wednesday_hours DECIMAL(4,2) DEFAULT 0,
  thursday_hours DECIMAL(4,2) DEFAULT 0,
  friday_hours DECIMAL(4,2) DEFAULT 0,
  saturday_hours DECIMAL(4,2) DEFAULT 0,
  sunday_hours DECIMAL(4,2) DEFAULT 0,
  total_weekly_hours DECIMAL(5,2) GENERATED ALWAYS AS (
    monday_hours + tuesday_hours + wednesday_hours + thursday_hours +
    friday_hours + saturday_hours + sunday_hours
  ) STORED,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  UNIQUE KEY uq_working_schedule_employee (employee_id)
);

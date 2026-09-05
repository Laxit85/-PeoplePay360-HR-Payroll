-- Owner: Person 4 (Payroll)
CREATE TABLE IF NOT EXISTS salary_structure_rules (
  salary_structure_id INT NOT NULL,
  salary_rule_id INT NOT NULL,
  sequence INT NOT NULL,
  PRIMARY KEY (salary_structure_id, salary_rule_id),
  FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id),
  FOREIGN KEY (salary_rule_id) REFERENCES salary_rules(id)
);

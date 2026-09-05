const { pool } = require('../config/db');

// GET /api/departments
exports.getDepartments = async (req, res) => {
  try {
    const [departments] = await pool.execute(
      `SELECT d.*, CONCAT(e.first_name, ' ', e.last_name) AS manager_name 
       FROM departments d 
       LEFT JOIN employees e ON d.manager_id = e.id 
       ORDER BY d.name ASC`
    );
    res.status(200).json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/departments
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, manager_id } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO departments (name, code, manager_id) VALUES (?, ?, ?)',
      [name, code, manager_id || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name, code, manager_id } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/job-positions
exports.getJobPositions = async (req, res) => {
  try {
    const [positions] = await pool.execute(
      `SELECT jp.*, d.name AS department_name 
       FROM job_positions jp 
       JOIN departments d ON jp.department_id = d.id 
       ORDER BY jp.title ASC`
    );
    res.status(200).json({ success: true, count: positions.length, data: positions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/job-positions
exports.createJobPosition = async (req, res) => {
  try {
    const { title, department_id } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO job_positions (title, department_id) VALUES (?, ?)',
      [title, department_id]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, title, department_id } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

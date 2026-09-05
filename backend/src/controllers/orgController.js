const { pool } = require('../config/db');

// GET /api/departments
exports.getDepartments = async (req, res) => {
  try {
    const [departments] = await pool.execute(
      `SELECT 
        d.*,
        CONCAT(e.first_name, ' ', e.last_name) AS manager_name,
        COUNT(emp.id) AS employee_count
       FROM departments d 
       LEFT JOIN employees e ON d.manager_id = e.id 
       LEFT JOIN employees emp ON d.id = emp.department_id AND emp.employment_status = 'ACTIVE'
       GROUP BY d.id
       ORDER BY d.name ASC`
    );

    const formatted = departments.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      manager_id: d.manager_id,
      managerId: d.manager_id,
      manager_name: d.manager_name,
      managerName: d.manager_name || 'Unassigned',
      employee_count: d.employee_count,
      employeeCount: d.employee_count,
      company: 'OXP Global Inc.',
      status: 'Active'
    }));

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/departments
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, manager_id, managerId, managerName } = req.body;

    let targetManagerId = manager_id || managerId || null;
    if (!targetManagerId && managerName) {
      const [emp] = await pool.execute(
        `SELECT id FROM employees WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1`,
        [managerName.trim(), managerName.trim()]
      );
      if (emp.length > 0) targetManagerId = emp[0].id;
    }

    const [result] = await pool.execute(
      'INSERT INTO departments (name, code, manager_id) VALUES (?, ?, ?)',
      [name.trim(), code.trim().toUpperCase(), targetManagerId]
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { id: result.insertId, name: name.trim(), code: code.trim().toUpperCase(), manager_id: targetManagerId }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
  try {
    const deptId = req.params.id;
    const { name, code, manager_id, managerId, managerName } = req.body;

    let targetManagerId = manager_id !== undefined ? manager_id : managerId;
    if (targetManagerId === undefined && managerName) {
      const [emp] = await pool.execute(
        `SELECT id FROM employees WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1`,
        [managerName.trim(), managerName.trim()]
      );
      if (emp.length > 0) targetManagerId = emp[0].id;
    }

    await pool.execute(
      'UPDATE departments SET name = COALESCE(?, name), code = COALESCE(?, code), manager_id = ? WHERE id = ?',
      [name ? name.trim() : null, code ? code.trim().toUpperCase() : null, targetManagerId ?? null, deptId]
    );

    res.status(200).json({ success: true, message: 'Department updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/departments/:id
exports.deleteDepartment = async (req, res) => {
  try {
    await pool.execute('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true, message: 'Department deleted successfully' });
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

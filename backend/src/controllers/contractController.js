const { pool } = require('../config/db');

// GET /api/contracts
exports.getContracts = async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = `
      SELECT 
        c.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email AS employee_email,
        d.name AS department_name,
        COALESCE(c.reference_name, jp.title, 'Software Engineer') AS job_position_title,
        ss.name AS salary_structure_name,
        ss.code AS salary_structure_code
      FROM contracts c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      JOIN salary_structures ss ON c.salary_structure_id = ss.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      const cleanEmpId = String(employee_id).replace(/^emp-/i, '');
      query += ' AND (c.employee_id = ? OR e.employee_code = ? OR c.employee_id = ?)';
      params.push(employee_id, employee_id, cleanEmpId);
    }
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.start_date DESC';

    const [contracts] = await pool.execute(query, params);
    res.status(200).json({ success: true, count: contracts.length, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/contracts/:id
exports.getContractById = async (req, res) => {
  try {
    const [contracts] = await pool.execute(
      `SELECT c.*, e.employee_code, e.first_name, e.last_name, 
              COALESCE(c.reference_name, jp.title, 'Software Engineer') AS job_position_title,
              ss.name AS salary_structure_name
       FROM contracts c
       JOIN employees e ON c.employee_id = e.id
       LEFT JOIN job_positions jp ON e.job_position_id = jp.id
       JOIN salary_structures ss ON c.salary_structure_id = ss.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (contracts.length === 0) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }
    res.status(200).json({ success: true, data: contracts[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/contracts
exports.createContract = async (req, res) => {
  try {
    const {
      employee_id,
      reference_name,
      salary_structure_id,
      working_schedule_id,
      wage,
      wage_type,
      start_date,
      end_date,
      status
    } = req.body;

    let targetEmployeeId = employee_id;
    if (typeof targetEmployeeId === 'string') {
      const cleanEmpId = targetEmployeeId.replace(/^emp-/i, '');
      const [foundEmp] = await pool.execute(
        'SELECT id FROM employees WHERE id = ? OR employee_code = ? LIMIT 1',
        [cleanEmpId, targetEmployeeId]
      );
      if (foundEmp.length > 0) {
        targetEmployeeId = foundEmp[0].id;
      } else if (!isNaN(cleanEmpId)) {
        targetEmployeeId = parseInt(cleanEmpId, 10);
      }
    }

    const normalizedStatus = (status === 'Running' || status === 'ACTIVE') ? 'ACTIVE' : (status || 'DRAFT');

    // Concurrency Rule: If creating as ACTIVE, transition any previous active contracts to EXPIRED
    if (normalizedStatus === 'ACTIVE') {
      await pool.execute(
        `UPDATE contracts SET status = 'EXPIRED' WHERE employee_id = ? AND status IN ('ACTIVE', 'Running')`,
        [targetEmployeeId]
      );
    }

    // Sync job position title to employees and job_positions table
    if (reference_name && reference_name.trim()) {
      const cleanTitle = reference_name.trim();
      const [jRows] = await pool.execute('SELECT id FROM job_positions WHERE title = ? OR title LIKE ? LIMIT 1', [cleanTitle, `%${cleanTitle}%`]);
      let jobId;
      if (jRows.length > 0) {
        jobId = jRows[0].id;
      } else {
        const [newJob] = await pool.execute('INSERT INTO job_positions (title, department_id) VALUES (?, 1)', [cleanTitle]);
        jobId = newJob.insertId;
      }
      await pool.execute('UPDATE employees SET job_position_id = ? WHERE id = ?', [jobId, targetEmployeeId]);
    }

    const [result] = await pool.execute(
      `INSERT INTO contracts (
        employee_id, reference_name, salary_structure_id, working_schedule_id,
        wage, wage_type, start_date, end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetEmployeeId,
        reference_name || 'Employment Contract',
        salary_structure_id !== undefined && salary_structure_id !== null ? salary_structure_id : 1,
        working_schedule_id !== undefined ? working_schedule_id : null,
        wage !== undefined && wage !== null ? wage : 0,
        wage_type !== undefined && wage_type !== null ? wage_type : 'MONTHLY',
        start_date !== undefined && start_date !== null ? start_date : '2026-01-01',
        end_date !== undefined ? end_date : null,
        normalizedStatus
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Contract created successfully',
      data: { id: result.insertId, ...req.body, status: normalizedStatus }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/contracts/:id
exports.updateContract = async (req, res) => {
  try {
    const contractId = req.params.id;
    const {
      reference_name,
      salary_structure_id,
      working_schedule_id,
      wage,
      wage_type,
      start_date,
      end_date,
      status
    } = req.body;

    const normalizedStatus = status ? ((status === 'Running' || status === 'ACTIVE') ? 'ACTIVE' : status) : null;

    const [currentRows] = await pool.execute('SELECT employee_id FROM contracts WHERE id = ?', [contractId]);
    if (currentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }
    const targetEmployeeId = currentRows[0].employee_id;

    // If changing to ACTIVE, transition other active contracts to EXPIRED
    if (normalizedStatus === 'ACTIVE') {
      await pool.execute(
        `UPDATE contracts SET status = 'EXPIRED' WHERE employee_id = ? AND status IN ('ACTIVE', 'Running') AND id != ?`,
        [targetEmployeeId, contractId]
      );
    }

    // Sync job position title to employees and job_positions table
    if (reference_name && reference_name.trim()) {
      const cleanTitle = reference_name.trim();
      const [jRows] = await pool.execute('SELECT id FROM job_positions WHERE title = ? OR title LIKE ? LIMIT 1', [cleanTitle, `%${cleanTitle}%`]);
      let jobId;
      if (jRows.length > 0) {
        jobId = jRows[0].id;
      } else {
        const [newJob] = await pool.execute('INSERT INTO job_positions (title, department_id) VALUES (?, 1)', [cleanTitle]);
        jobId = newJob.insertId;
      }
      await pool.execute('UPDATE employees SET job_position_id = ? WHERE id = ?', [jobId, targetEmployeeId]);
    }

    await pool.execute(
      `UPDATE contracts SET
        reference_name = COALESCE(?, reference_name),
        salary_structure_id = COALESCE(?, salary_structure_id),
        working_schedule_id = COALESCE(?, working_schedule_id),
        wage = COALESCE(?, wage),
        wage_type = COALESCE(?, wage_type),
        start_date = COALESCE(?, start_date),
        end_date = ?,
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        reference_name !== undefined ? reference_name : null,
        salary_structure_id !== undefined ? salary_structure_id : null,
        working_schedule_id !== undefined ? working_schedule_id : null,
        wage !== undefined ? wage : null,
        wage_type !== undefined ? wage_type : null,
        start_date !== undefined ? start_date : null,
        end_date !== undefined ? end_date : null,
        normalizedStatus !== undefined ? normalizedStatus : null,
        contractId
      ]
    );

    res.status(200).json({ success: true, message: 'Contract updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/contracts/:id
exports.deleteContract = async (req, res) => {
  try {
    await pool.execute('DELETE FROM contracts WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true, message: 'Contract deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

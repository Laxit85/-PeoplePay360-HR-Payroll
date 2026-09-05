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
        jp.title AS job_position_title,
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
      query += ' AND c.employee_id = ?';
      params.push(employee_id);
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
      `SELECT c.*, e.employee_code, e.first_name, e.last_name, ss.name AS salary_structure_name
       FROM contracts c
       JOIN employees e ON c.employee_id = e.id
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

    // Concurrency Rule: If creating as ACTIVE, ensure no other active contract exists
    if (status === 'ACTIVE') {
      const [existingActive] = await pool.execute(
        `SELECT id, reference_name FROM contracts WHERE employee_id = ? AND status = 'ACTIVE'`,
        [employee_id]
      );
      if (existingActive.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Employee already has an active contract (${existingActive[0].reference_name}). Please expire or terminate it first.`
        });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO contracts (
        employee_id, reference_name, salary_structure_id, working_schedule_id,
        wage, wage_type, start_date, end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id, reference_name, salary_structure_id, working_schedule_id || null,
        wage, wage_type || 'MONTHLY', start_date, end_date || null, status || 'DRAFT'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Contract created successfully',
      data: { id: result.insertId, ...req.body }
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

    // If changing to ACTIVE, ensure no other active contract exists
    if (status === 'ACTIVE') {
      const [[current]] = await pool.execute('SELECT employee_id FROM contracts WHERE id = ?', [contractId]);
      if (current) {
        const [otherActive] = await pool.execute(
          `SELECT id, reference_name FROM contracts WHERE employee_id = ? AND status = 'ACTIVE' AND id != ?`,
          [current.employee_id, contractId]
        );
        if (otherActive.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Employee already has another active contract (${otherActive[0].reference_name}).`
          });
        }
      }
    }

    await pool.execute(
      `UPDATE contracts SET
        reference_name = COALESCE(?, reference_name),
        salary_structure_id = COALESCE(?, salary_structure_id),
        working_schedule_id = ?,
        wage = COALESCE(?, wage),
        wage_type = COALESCE(?, wage_type),
        start_date = COALESCE(?, start_date),
        end_date = ?,
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        reference_name, salary_structure_id, working_schedule_id || null,
        wage, wage_type, start_date, end_date || null, status,
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

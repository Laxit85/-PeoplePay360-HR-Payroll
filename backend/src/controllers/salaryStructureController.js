const { pool } = require('../config/db');

// GET /api/salary-structures (with rules count and assigned employee count)
exports.getStructures = async (req, res) => {
  try {
    const [structures] = await pool.execute(`
      SELECT 
        ss.*,
        COUNT(DISTINCT sr.id) AS rules_count,
        COUNT(DISTINCT c.id) AS employees_count
      FROM salary_structures ss
      LEFT JOIN salary_rules sr ON ss.id = sr.structure_id
      LEFT JOIN contracts c ON ss.id = c.salary_structure_id AND c.status = 'ACTIVE'
      GROUP BY ss.id
      ORDER BY ss.name ASC
    `);
    res.status(200).json({ success: true, count: structures.length, data: structures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/salary-structures/:id (with sequenced rules)
exports.getStructureById = async (req, res) => {
  try {
    const [structures] = await pool.execute('SELECT * FROM salary_structures WHERE id = ?', [req.params.id]);
    if (structures.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    const [rules] = await pool.execute(
      'SELECT * FROM salary_rules WHERE structure_id = ? ORDER BY sequence ASC',
      [req.params.id]
    );

    const [[{ emp_count }]] = await pool.execute(
      'SELECT COUNT(*) AS emp_count FROM contracts WHERE salary_structure_id = ? AND status = "ACTIVE"',
      [req.params.id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...structures[0],
        rules,
        employeesCount: emp_count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/salary-structures
exports.createStructure = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO salary_structures (name, code, description) VALUES (?, ?, ?)',
      [name, code, description || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/salary-structures/:id/rules (Add or update rule)
exports.addOrUpdateRule = async (req, res) => {
  try {
    const structureId = req.params.id;
    const {
      rule_id,
      name,
      code,
      category,
      sequence,
      computation_type,
      percentage_base_code,
      percentage_rate,
      fixed_amount,
      formula_expression
    } = req.body;

    if (rule_id) {
      await pool.execute(
        `UPDATE salary_rules SET
          name = ?, code = ?, category = ?, sequence = ?, computation_type = ?,
          percentage_base_code = ?, percentage_rate = ?, fixed_amount = ?, formula_expression = ?
         WHERE id = ? AND structure_id = ?`,
        [
          name, code, category, sequence, computation_type,
          percentage_base_code || null, percentage_rate || null, fixed_amount || null, formula_expression || null,
          rule_id, structureId
        ]
      );
      return res.status(200).json({ success: true, message: 'Rule updated successfully' });
    }

    const [result] = await pool.execute(
      `INSERT INTO salary_rules (
        structure_id, name, code, category, sequence, computation_type,
        percentage_base_code, percentage_rate, fixed_amount, formula_expression
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        structureId, name, code, category, sequence, computation_type,
        percentage_base_code || null, percentage_rate || null, fixed_amount || null, formula_expression || null
      ]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/salary-structures/:id/rules/:ruleId
exports.deleteRule = async (req, res) => {
  try {
    await pool.execute('DELETE FROM salary_rules WHERE id = ? AND structure_id = ?', [
      req.params.ruleId,
      req.params.id
    ]);
    res.status(200).json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

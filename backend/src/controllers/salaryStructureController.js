const { pool } = require('../config/db');

// GET /api/salary-structures (with rules and assigned employee count)
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

    const [allRules] = await pool.execute(
      'SELECT * FROM salary_rules ORDER BY structure_id ASC, sequence ASC'
    );

    const structuresWithRules = structures.map(s => ({
      ...s,
      rules: allRules.filter(r => r.structure_id === s.id).map(r => ({
        id: r.id,
        name: r.name,
        code: r.code,
        category: r.category,
        sequence: r.sequence,
        computation_type: r.computation_type,
        computationMethod: r.computation_type === 'FIXED' ? 'Fixed Amount' : (r.computation_type === 'PERCENTAGE' ? 'Percentage' : 'Formula'),
        fixed_amount: r.fixed_amount,
        percentage_rate: r.percentage_rate
      }))
    }));

    res.status(200).json({ success: true, count: structuresWithRules.length, data: structuresWithRules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/salary-structures/rules (All rules for RuleListPage)
exports.getAllRules = async (req, res) => {
  try {
    const [rules] = await pool.execute(`
      SELECT sr.*, ss.name AS structure_name 
      FROM salary_rules sr 
      LEFT JOIN salary_structures ss ON sr.structure_id = ss.id 
      ORDER BY sr.sequence ASC, sr.id ASC
    `);

    const formattedRules = rules.map(r => ({
      id: r.id,
      structure_id: r.structure_id,
      structureId: r.structure_id,
      structureName: r.structure_name || 'Standard Structure',
      name: r.name,
      code: r.code,
      category: r.category ? (r.category.charAt(0).toUpperCase() + r.category.slice(1).toLowerCase()) : 'Allowance',
      sequence: r.sequence,
      computationMethod: r.computation_type === 'FIXED' ? 'Fixed Amount' : (r.computation_type === 'PERCENTAGE' ? 'Percentage' : 'Formula'),
      computation_type: r.computation_type,
      percentageBase: r.percentage_base_code || 'Basic',
      percentage_base_code: r.percentage_base_code,
      amountPercentage: Number(r.percentage_rate || 0),
      percentage_rate: Number(r.percentage_rate || 0),
      fixedAmount: Number(r.fixed_amount || 0),
      fixed_amount: Number(r.fixed_amount || 0),
      formula: r.formula_expression || '',
      formula_expression: r.formula_expression || '',
      is_active: r.is_active
    }));

    res.status(200).json({ success: true, count: formattedRules.length, data: formattedRules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/salary-structures/rules (Create or update rule from RuleListPage)
exports.saveSalaryRule = async (req, res) => {
  try {
    const {
      id,
      structure_id,
      structureId,
      name,
      code,
      category,
      sequence,
      computationMethod,
      computation_type,
      percentageBase,
      percentage_base_code,
      amountPercentage,
      percentage_rate,
      fixedAmount,
      fixed_amount,
      formula,
      formula_expression
    } = req.body;

    // Resolve structure id (default to 1)
    let assignedStructureId = structure_id || structureId;
    if (!assignedStructureId) {
      const [defaultStruct] = await pool.execute('SELECT id FROM salary_structures ORDER BY id ASC LIMIT 1');
      assignedStructureId = defaultStruct[0]?.id || 1;
    }

    // Map Category to ENUM('BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET')
    const catUpper = String(category || 'ALLOWANCE').toUpperCase();
    const validCat = ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET'].includes(catUpper) ? catUpper : 'ALLOWANCE';

    // Map Computation Type to ENUM('FIXED', 'PERCENTAGE', 'FORMULA')
    let compType = 'PERCENTAGE';
    if (computation_type) {
      compType = String(computation_type).toUpperCase();
    } else if (computationMethod) {
      if (computationMethod === 'Fixed Amount') compType = 'FIXED';
      else if (computationMethod === 'Formula') compType = 'FORMULA';
      else compType = 'PERCENTAGE';
    }

    const baseCode = percentageBase || percentage_base_code || null;
    const rate = amountPercentage !== undefined ? amountPercentage : (percentage_rate || null);
    const fixed = fixedAmount !== undefined ? fixedAmount : (fixed_amount || null);
    const expr = formula || formula_expression || null;

    if (id) {
      await pool.execute(
        `UPDATE salary_rules SET
          name = ?, code = ?, category = ?, sequence = ?, computation_type = ?,
          percentage_base_code = ?, percentage_rate = ?, fixed_amount = ?, formula_expression = ?
         WHERE id = ?`,
        [name, code, validCat, sequence || 1, compType, baseCode, rate, fixed, expr, id]
      );
      return res.status(200).json({ success: true, message: 'Salary rule updated successfully' });
    }

    const [result] = await pool.execute(
      `INSERT INTO salary_rules (
        structure_id, name, code, category, sequence, computation_type,
        percentage_base_code, percentage_rate, fixed_amount, formula_expression
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [assignedStructureId, name, code, validCat, sequence || 1, compType, baseCode, rate, fixed, expr]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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

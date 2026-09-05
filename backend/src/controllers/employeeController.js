const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/employees (with filters and search)
exports.getEmployees = async (req, res) => {
  try {
    const { department_id, status, type, search } = req.query;
    let query = `
      SELECT 
        e.*,
        d.name AS department_name,
        d.code AS department_code,
        jp.title AS job_position_title,
        ws.name AS working_schedule_name,
        ws.total_weekly_hours,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN working_schedules ws ON e.working_schedule_id = ws.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE 1=1
    `;

    const params = [];

    if (department_id) {
      query += ' AND e.department_id = ?';
      params.push(department_id);
    }
    if (status) {
      query += ' AND e.employment_status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND e.employee_type = ?';
      params.push(type);
    }
    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY e.id DESC';

    const [employees] = await pool.execute(query, params);
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/employees/:id (with Smart Counters & Active Contract)
exports.getEmployeeById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const cleanId = String(rawId).replace(/^emp-/i, '');

    const [employees] = await pool.execute(
      `SELECT 
        e.*,
        d.name AS department_name,
        d.code AS department_code,
        jp.title AS job_position_title,
        ws.name AS working_schedule_name,
        ws.total_weekly_hours,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN working_schedules ws ON e.working_schedule_id = ws.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = ? OR e.employee_code = ? OR e.id = ?`,
      [rawId, rawId, cleanId]
    );

    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const employee = employees[0];
    const realId = employee.id;

    // Smart Counters
    const [[{ contracts_count }]] = await pool.execute(
      'SELECT COUNT(*) AS contracts_count FROM contracts WHERE employee_id = ?',
      [realId]
    );
    const [[{ attendance_count }]] = await pool.execute(
      'SELECT COUNT(*) AS attendance_count FROM attendances WHERE employee_id = ?',
      [realId]
    );
    const [[{ time_off_count }]] = await pool.execute(
      'SELECT COUNT(*) AS time_off_count FROM time_off_requests WHERE employee_id = ?',
      [realId]
    );
    const [[{ allocations_count }]] = await pool.execute(
      'SELECT COUNT(*) AS allocations_count FROM time_off_allocations WHERE employee_id = ?',
      [realId]
    );
    const [[{ payslips_count }]] = await pool.execute(
      'SELECT COUNT(*) AS payslips_count FROM payslips WHERE employee_id = ?',
      [realId]
    );

    // Active Contract lookup
    const [activeContracts] = await pool.execute(
      `SELECT c.*, ss.name AS salary_structure_name, ss.code AS salary_structure_code
       FROM contracts c
       JOIN salary_structures ss ON c.salary_structure_id = ss.id
       WHERE c.employee_id = ? AND c.status = 'ACTIVE'
       LIMIT 1`,
      [realId]
    );

    res.status(200).json({
      success: true,
      data: employee,
      smartCounters: {
        contractsCount: contracts_count,
        attendanceCount: attendance_count,
        timeOffCount: time_off_count,
        allocationsCount: allocations_count,
        payslipsCount: payslips_count
      },
      activeContract: activeContracts[0] || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper to normalize and resolve employee payload across frontend formats
async function resolveEmployeePayload(body) {
  const payload = { ...body };

  // 1. Resolve first_name and last_name
  if (!payload.first_name && payload.name) {
    const parts = payload.name.trim().split(' ');
    payload.first_name = parts[0] || 'Employee';
    payload.last_name = parts.slice(1).join(' ') || 'Team';
  }
  if (!payload.first_name && payload.email) {
    payload.first_name = payload.email.split('@')[0] || 'Employee';
  }
  if (!payload.last_name && payload.last_name !== '') {
    payload.last_name = payload.last_name || 'Member';
  }

  // 2. Email & Phone mappings
  if (!payload.email && payload.workEmail) payload.email = payload.workEmail;
  if (!payload.phone && payload.workPhone) payload.phone = payload.workPhone;

  // 3. Department mapping (name -> department_id)
  if (!payload.department_id && (payload.department || payload.department_name)) {
    const deptName = payload.department || payload.department_name;
    const [dRows] = await pool.execute('SELECT id FROM departments WHERE name LIKE ? LIMIT 1', [`%${deptName}%`]);
    if (dRows.length > 0) {
      payload.department_id = dRows[0].id;
    }
  }

  // 4. Job Position mapping (title -> job_position_id)
  const jobTitle = payload.job_title || payload.jobTitle || payload.job_position_title;
  if (!payload.job_position_id && jobTitle) {
    const [jRows] = await pool.execute('SELECT id FROM job_positions WHERE title LIKE ? LIMIT 1', [`%${jobTitle}%`]);
    if (jRows.length > 0) {
      payload.job_position_id = jRows[0].id;
    } else {
      const deptId = payload.department_id || 1;
      const [newJob] = await pool.execute(
        'INSERT INTO job_positions (title, department_id) VALUES (?, ?)',
        [jobTitle, deptId]
      );
      payload.job_position_id = newJob.insertId;
    }
  }

  // 5. Employee type normalization
  const rawType = payload.employee_type || payload.employeeType;
  if (rawType) {
    const norm = String(rawType).toUpperCase().replace(/[-\s]/g, '_');
    if (['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'].includes(norm)) {
      payload.employee_type = norm;
    }
  }

  // 6. Employment status normalization
  const rawStatus = payload.employment_status || payload.status;
  if (rawStatus) {
    const norm = String(rawStatus).toUpperCase().replace(/[-\s]/g, '_');
    if (['PROBATION', 'ACTIVE', 'NOTICE_PERIOD', 'TERMINATED'].includes(norm)) {
      payload.employment_status = norm;
    }
  }

  // 7. Bank & Tax fields mapping
  if (!payload.bank_name && payload.bankName) payload.bank_name = payload.bankName;
  if (!payload.bank_account_no && (payload.bankAccountNo || payload.accountNumber)) {
    payload.bank_account_no = payload.bankAccountNo || payload.accountNumber;
  }
  if (!payload.bank_ifsc_or_routing && (payload.bankIfscOrRouting || payload.ifscCode)) {
    payload.bank_ifsc_or_routing = payload.bankIfscOrRouting || payload.ifscCode;
  }
  if (!payload.tax_id_or_pan && (payload.taxIdOrPan || payload.taxId)) {
    payload.tax_id_or_pan = payload.taxIdOrPan || payload.taxId;
  }

  return payload;
}

// POST /api/employees (Auto-links or creates linked User account if user_id is not passed)
exports.createEmployee = async (req, res) => {
  try {
    const payload = await resolveEmployeePayload(req.body);
    const {
      employee_code,
      first_name,
      last_name,
      email,
      phone,
      department_id,
      job_position_id,
      manager_id,
      working_schedule_id,
      employee_type,
      employment_status,
      joining_date,
      bank_name,
      bank_account_no,
      bank_ifsc_or_routing,
      tax_id_or_pan,
      user_id
    } = payload;

    let assignedUserId = user_id || null;

    // If user_id is not explicitly passed, auto-link or auto-create user login account
    if (!assignedUserId && email) {
      const [existingUser] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
        assignedUserId = existingUser[0].id;
      } else {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Employee123!', salt);
        const [newUser] = await pool.execute(
          'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
          [email, passwordHash, 5]
        );
        assignedUserId = newUser.insertId;
      }
    }

    const codeToUse = employee_code || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const [result] = await pool.execute(
      `INSERT INTO employees (
        employee_code, first_name, last_name, email, phone,
        department_id, job_position_id, manager_id, working_schedule_id,
        employee_type, employment_status, joining_date,
        bank_name, bank_account_no, bank_ifsc_or_routing, tax_id_or_pan, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codeToUse, first_name || 'Employee', last_name || '', email, phone || null,
        department_id || 1, job_position_id || 1, manager_id || null, working_schedule_id || 1,
        employee_type || 'FULL_TIME', employment_status || 'ACTIVE', joining_date || new Date().toISOString().split('T')[0],
        bank_name || null, bank_account_no || null, bank_ifsc_or_routing || null, tax_id_or_pan || null,
        assignedUserId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully and linked to User account',
      data: {
        id: result.insertId,
        user_id: assignedUserId,
        employee_code: codeToUse,
        ...payload
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const rawId = req.params.id;
    const cleanId = String(rawId).replace(/^emp-/i, '');

    // Resolve target employee ID
    const [empRows] = await pool.execute('SELECT id FROM employees WHERE id = ? OR employee_code = ? LIMIT 1', [cleanId, rawId]);
    const employeeId = empRows[0]?.id || cleanId;

    // Normal employees can only update their own employee record
    if (req.user?.role === 'EMPLOYEE') {
      const [userEmps] = await pool.execute('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
      const myEmpId = userEmps[0]?.id;
      if (myEmpId && String(employeeId) !== String(myEmpId)) {
        return res.status(403).json({ success: false, message: 'You can only update your own employee record' });
      }
    }

    const payload = await resolveEmployeePayload(req.body);

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'department_id',
      'job_position_id', 'manager_id', 'working_schedule_id', 'employee_type',
      'employment_status', 'joining_date', 'bank_name', 'bank_account_no',
      'bank_ifsc_or_routing', 'tax_id_or_pan', 'user_id'
    ];

    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(payload)) {
      if (allowedFields.includes(key) && val !== undefined) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
    }

    values.push(employeeId);
    const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;

    await pool.execute(query, values);
    res.status(200).json({ success: true, message: 'Employee updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  try {
    const rawId = req.params.id;
    const cleanId = String(rawId).replace(/^emp-/i, '');
    await pool.execute('DELETE FROM employees WHERE id = ? OR employee_code = ?', [cleanId, rawId]);
    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

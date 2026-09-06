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
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        COALESCE(c.wage, 0) AS wage,
        COALESCE(c.wage, 0) AS contract_wage,
        c.id AS contract_id,
        c.reference_name AS contract_reference,
        c.salary_structure_id AS contract_structure_id,
        c.status AS contract_status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN working_schedules ws ON e.working_schedule_id = ws.id
      LEFT JOIN employees m ON e.manager_id = m.id
      LEFT JOIN contracts c ON c.id = (
        SELECT id FROM contracts 
        WHERE employee_id = e.id AND status = 'ACTIVE' 
        ORDER BY id DESC LIMIT 1
      )
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

    if (req.user && req.user.role === 'EMPLOYEE') {
      const empId = req.user.employeeId || req.user.employee?.id;
      if (empId) {
        query += ' AND (e.id = ? OR e.user_id = ? OR e.email = ?)';
        params.push(empId, req.user.id, req.user.email);
      } else {
        query += ' AND (e.user_id = ? OR e.email = ?)';
        params.push(req.user.id, req.user.email);
      }
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
    const employeeId = req.params.id;

    const [employees] = await pool.execute(
      `SELECT 
        e.*,
        d.name AS department_name,
        d.code AS department_code,
        jp.title AS job_position_title,
        ws.name AS working_schedule_name,
        ws.total_weekly_hours,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        COALESCE(c.wage, 0) AS wage,
        COALESCE(c.wage, 0) AS contract_wage,
        c.id AS contract_id,
        c.reference_name AS contract_reference,
        c.salary_structure_id AS contract_structure_id,
        c.status AS contract_status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN job_positions jp ON e.job_position_id = jp.id
      LEFT JOIN working_schedules ws ON e.working_schedule_id = ws.id
      LEFT JOIN employees m ON e.manager_id = m.id
      LEFT JOIN contracts c ON c.id = (
        SELECT id FROM contracts 
        WHERE employee_id = e.id AND status = 'ACTIVE' 
        ORDER BY id DESC LIMIT 1
      )
      WHERE e.id = ?`,
      [employeeId]
    );

    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const employee = employees[0];

    // If EMPLOYEE role, ensure they only view their own record
    if (req.user && req.user.role === 'EMPLOYEE') {
      const userEmpId = req.user.employeeId || req.user.employee?.id;
      if (employee.id !== userEmpId && employee.user_id !== req.user.id && employee.email !== req.user.email) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are only permitted to view your own profile.' });
      }
    }

    // Smart Counters
    const [[{ contracts_count }]] = await pool.execute(
      'SELECT COUNT(*) AS contracts_count FROM contracts WHERE employee_id = ?',
      [employeeId]
    );
    const [[{ attendance_count }]] = await pool.execute(
      'SELECT COUNT(*) AS attendance_count FROM attendances WHERE employee_id = ?',
      [employeeId]
    );
    const [[{ time_off_count }]] = await pool.execute(
      'SELECT COUNT(*) AS time_off_count FROM time_off_requests WHERE employee_id = ?',
      [employeeId]
    );
    const [[{ allocations_count }]] = await pool.execute(
      'SELECT COUNT(*) AS allocations_count FROM time_off_allocations WHERE employee_id = ?',
      [employeeId]
    );
    const [[{ payslips_count }]] = await pool.execute(
      'SELECT COUNT(*) AS payslips_count FROM payslips WHERE employee_id = ?',
      [employeeId]
    );

    // Active Contract lookup
    const [activeContracts] = await pool.execute(
      `SELECT c.*, ss.name AS salary_structure_name, ss.code AS salary_structure_code
       FROM contracts c
       JOIN salary_structures ss ON c.salary_structure_id = ss.id
       WHERE c.employee_id = ? AND c.status = 'ACTIVE'
       LIMIT 1`,
      [employeeId]
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

// POST /api/employees (Auto-links or creates linked User account if user_id is not passed)
exports.createEmployee = async (req, res) => {
  try {
    let {
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
      user_id,
      fullName,
      job_title,
      department
    } = req.body;

    if (!first_name && fullName) {
      const parts = fullName.trim().split(' ');
      first_name = parts[0];
      last_name = parts.slice(1).join(' ') || 'Employee';
    }

    if (!first_name || !email) {
      return res.status(400).json({ success: false, message: 'First name and email are required' });
    }

    // Resolve department_id if department string was provided
    let deptId = department_id;
    if (!deptId && department) {
      const [deptRows] = await pool.query('SELECT id FROM departments WHERE name LIKE ?', [`%${department}%`]);
      if (deptRows.length > 0) {
        deptId = deptRows[0].id;
      }
    }
    if (!deptId) deptId = 1;

    // Resolve job_position_id if job_title string was provided
    let jobPosId = job_position_id;
    if (!jobPosId && job_title) {
      const [jobRows] = await pool.query('SELECT id FROM job_positions WHERE title LIKE ?', [`%${job_title}%`]);
      if (jobRows.length > 0) {
        jobPosId = jobRows[0].id;
      } else {
        const [newJob] = await pool.query('INSERT INTO job_positions (title, department_id) VALUES (?, ?)', [job_title, deptId]);
        jobPosId = newJob.insertId;
      }
    }
    if (!jobPosId) jobPosId = 1;

    // Check if employee with email already exists - if so, gracefully update and return
    const [existingEmp] = await pool.query('SELECT id, employee_code, user_id FROM employees WHERE email = ?', [email]);
    if (existingEmp.length > 0) {
      const existingId = existingEmp[0].id;
      let existingUserId = existingEmp[0].user_id;

      if (!existingUserId) {
        const [uRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (uRows.length > 0) {
          existingUserId = uRows[0].id;
        } else {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash('employee123', salt);
          const [newUser] = await pool.query(
            'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
            [email, passwordHash, 5]
          );
          existingUserId = newUser.insertId;
        }
      }

      await pool.query(
        `UPDATE employees SET
          first_name = ?, last_name = ?, phone = COALESCE(?, phone),
          department_id = COALESCE(?, department_id),
          job_position_id = COALESCE(?, job_position_id),
          user_id = COALESCE(?, user_id)
         WHERE id = ?`,
        [first_name, last_name || '', phone || null, deptId, jobPosId, existingUserId, existingId]
      );

      // Verify active contract exists
      const [existingContracts] = await pool.query(
        'SELECT id FROM contracts WHERE employee_id = ? AND status = "ACTIVE"',
        [existingId]
      );
      if (existingContracts.length === 0) {
        const initialWage = parseFloat(req.body.wage || req.body.contract_wage || 35000);
        await pool.query(
          `INSERT INTO contracts (
            employee_id, reference_name, salary_structure_id, working_schedule_id,
            wage, wage_type, start_date, status
          ) VALUES (?, ?, 1, ?, ?, 'MONTHLY', ?, 'ACTIVE')`,
          [
            existingId,
            `${first_name} ${last_name || ''} - Employment Agreement`.trim(),
            working_schedule_id || 1,
            initialWage,
            joining_date || new Date().toISOString().split('T')[0]
          ]
        );
      }

      // Verify leave allocations exist
      const [existingAlloc] = await pool.query(
        'SELECT id FROM time_off_allocations WHERE employee_id = ?',
        [existingId]
      );
      if (existingAlloc.length === 0) {
        await pool.query(
          `INSERT INTO time_off_allocations 
           (employee_id, time_off_type_id, allocated_days, taken_days, remaining_days, valid_from, valid_to, status, approved_by_user_id)
           VALUES 
           (?, 1, 20.00, 0.00, 20.00, '2026-01-01', '2026-12-31', 'APPROVED', 1),
           (?, 2, 12.00, 0.00, 12.00, '2026-01-01', '2026-12-31', 'APPROVED', 1)`,
          [existingId, existingId]
        );
      }

      return res.status(200).json({
        success: true,
        id: existingId,
        message: 'Employee record updated successfully',
        data: {
          id: existingId,
          employee_code: existingEmp[0].employee_code,
          first_name,
          last_name,
          email,
          phone
        }
      });
    }

    let assignedUserId = user_id || null;

    // If user_id is not explicitly passed, auto-link or auto-create user login account
    if (!assignedUserId && email) {
      const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
        assignedUserId = existingUser[0].id;
      } else {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Employee123!', salt);
        const [newUser] = await pool.query(
          'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
          [email, passwordHash, 5]
        );
        assignedUserId = newUser.insertId;
      }
    }

    const codeToUse = employee_code || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const [result] = await pool.query(
      `INSERT INTO employees (
        employee_code, first_name, last_name, email, phone,
        department_id, job_position_id, manager_id, working_schedule_id,
        employee_type, employment_status, joining_date,
        bank_name, bank_account_no, bank_ifsc_or_routing, tax_id_or_pan, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codeToUse, first_name, last_name || '', email, phone || null,
        deptId, jobPosId, manager_id || null, working_schedule_id || 1,
        employee_type || 'FULL_TIME', employment_status || 'ACTIVE', joining_date || new Date().toISOString().split('T')[0],
        bank_name || null, bank_account_no || null, bank_ifsc_or_routing || null, tax_id_or_pan || null,
        assignedUserId
      ]
    );

    const newEmpId = result.insertId;

    // 1. Auto-create active Employment Contract
    try {
      const initialWage = parseFloat(req.body.wage || req.body.contract_wage || 35000);
      await pool.query(
        `INSERT INTO contracts (
          employee_id, reference_name, salary_structure_id, working_schedule_id,
          wage, wage_type, start_date, status
        ) VALUES (?, ?, 1, ?, ?, 'MONTHLY', ?, 'ACTIVE')`,
        [
          newEmpId,
          `${first_name} ${last_name || ''} - Employment Agreement`.trim(),
          working_schedule_id || 1,
          initialWage,
          joining_date || new Date().toISOString().split('T')[0]
        ]
      );
    } catch (errContract) {
      console.error('Warning: Failed to auto-create contract for new employee', errContract);
    }

    // 2. Auto-provision common leave allocations (Paid Annual: 20 days, Paid Sick: 12 days)
    try {
      await pool.query(
        `INSERT INTO time_off_allocations 
         (employee_id, time_off_type_id, allocated_days, taken_days, remaining_days, valid_from, valid_to, status, approved_by_user_id)
         VALUES 
         (?, 1, 20.00, 0.00, 20.00, '2026-01-01', '2026-12-31', 'APPROVED', 1),
         (?, 2, 12.00, 0.00, 12.00, '2026-01-01', '2026-12-31', 'APPROVED', 1)`,
        [newEmpId, newEmpId]
      );
    } catch (errAlloc) {
      console.error('Warning: Failed to auto-allocate leaves for new employee', errAlloc);
    }

    res.status(201).json({
      success: true,
      id: newEmpId,
      message: 'Employee created successfully with active contract and leave allocations',
      data: {
        id: newEmpId,
        user_id: assignedUserId,
        employee_code: codeToUse,
        first_name,
        last_name,
        email,
        phone,
        department_id: deptId,
        job_position_id: jobPosId
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const fields = req.body;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'department_id',
      'job_position_id', 'manager_id', 'working_schedule_id', 'employee_type',
      'employment_status', 'joining_date', 'bank_name', 'bank_account_no',
      'bank_ifsc_or_routing', 'tax_id_or_pan', 'user_id'
    ];

    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
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
    const employeeId = req.params.id;
    await pool.execute('DELETE FROM employees WHERE id = ?', [employeeId]);
    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

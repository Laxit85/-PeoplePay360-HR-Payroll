const { pool } = require('../config/db');

// --- 1. TIME OFF TYPES ---
exports.getTypes = async (req, res) => {
  try {
    const [types] = await pool.execute('SELECT * FROM time_off_types ORDER BY name ASC');
    res.status(200).json({ success: true, count: types.length, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createType = async (req, res) => {
  try {
    const { name, code, unit, requires_allocation, is_unpaid } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO time_off_types (name, code, unit, requires_allocation, is_unpaid) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, code, unit || 'DAYS', requires_allocation ?? 1, is_unpaid ?? 0]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- 2. TIME OFF ALLOCATIONS ---
exports.getAllocations = async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = `
      SELECT 
        toa.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        tot.name AS time_off_type_name,
        tot.code AS time_off_type_code,
        tot.is_unpaid
      FROM time_off_allocations toa
      JOIN employees e ON toa.employee_id = e.id
      JOIN time_off_types tot ON toa.time_off_type_id = tot.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      query += ' AND toa.employee_id = ?';
      params.push(employee_id);
    } else if (req.user?.role === 'EMPLOYEE') {
      const [myEmps] = await pool.execute('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
      if (myEmps.length > 0) {
        query += ' AND toa.employee_id = ?';
        params.push(myEmps[0].id);
      }
    }
    if (status) {
      query += ' AND toa.status = ?';
      params.push(status);
    }

    query += ' ORDER BY toa.valid_from DESC';

    const [allocations] = await pool.execute(query, params);
    res.status(200).json({ success: true, count: allocations.length, data: allocations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAllocation = async (req, res) => {
  try {
    const { employee_id, time_off_type_id, allocated_days, valid_from, valid_to, status } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO time_off_allocations (employee_id, time_off_type_id, allocated_days, taken_days, remaining_days, valid_from, valid_to, status) 
       VALUES (?, ?, ?, 0.00, ?, ?, ?, ?)`,
      [employee_id, time_off_type_id, allocated_days, allocated_days, valid_from, valid_to, status || 'DRAFT']
    );

    res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.approveAllocation = async (req, res) => {
  try {
    await pool.execute(
      'UPDATE time_off_allocations SET status = "APPROVED", approved_by_user_id = ? WHERE id = ?',
      [req.user.id, req.params.id]
    );
    res.status(200).json({ success: true, message: 'Allocation approved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- 3. TIME OFF REQUESTS ---
exports.getRequests = async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = `
      SELECT 
        tor.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        tot.name AS time_off_type_name,
        tot.code AS time_off_type_code,
        tot.is_unpaid
      FROM time_off_requests tor
      JOIN employees e ON tor.employee_id = e.id
      JOIN time_off_types tot ON tor.time_off_type_id = tot.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      query += ' AND tor.employee_id = ?';
      params.push(employee_id);
    } else if (req.user?.role === 'EMPLOYEE') {
      const [myEmps] = await pool.execute('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
      if (myEmps.length > 0) {
        query += ' AND tor.employee_id = ?';
        params.push(myEmps[0].id);
      }
    }
    if (status) {
      query += ' AND tor.status = ?';
      params.push(status);
    }

    query += ' ORDER BY tor.date_from DESC';

    const [requests] = await pool.execute(query, params);
    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit request
exports.createRequest = async (req, res) => {
  try {
    let empId = req.body.employee_id || req.body.employeeId;
    if (!empId && req.user) {
      const [myEmps] = await pool.execute('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
      if (myEmps.length > 0) empId = myEmps[0].id;
    }
    if (!empId) empId = 1;

    const timeTypeId = req.body.time_off_type_id || req.body.timeOffTypeId || 1;
    const fromDate = req.body.date_from || req.body.start_date || req.body.startDate || new Date().toISOString().split('T')[0];
    const toDate = req.body.date_to || req.body.end_date || req.body.endDate || fromDate;
    const dur = Number(req.body.duration || req.body.requested_days || req.body.numberOfDays || 1);
    const reasonText = req.body.reason || null;

    // Check type requirement
    const [[type]] = await pool.execute('SELECT * FROM time_off_types WHERE id = ?', [timeTypeId]);
    let allocationId = null;

    if (type && type.requires_allocation) {
      // Find approved allocation with remaining balance
      const [allocations] = await pool.execute(
        `SELECT id, remaining_days FROM time_off_allocations 
         WHERE employee_id = ? AND time_off_type_id = ? AND status = 'APPROVED' 
           AND remaining_days >= ?
         ORDER BY valid_from ASC
         LIMIT 1`,
        [empId, timeTypeId, dur]
      );

      if (allocations.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient approved leave balance for this leave type.'
        });
      }
      allocationId = allocations[0].id;
    }

    const [result] = await pool.execute(
      `INSERT INTO time_off_requests (employee_id, time_off_type_id, allocation_id, date_from, date_to, duration, reason, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [empId, timeTypeId, allocationId, fromDate, toDate, dur, reasonText]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Approve request (Deducts balance from allocation)
exports.approveRequest = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const requestId = req.params.id;
    const [[request]] = await connection.execute(
      'SELECT tor.*, tot.requires_allocation FROM time_off_requests tor JOIN time_off_types tot ON tor.time_off_type_id = tot.id WHERE tor.id = ?',
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Request is already approved' });
    }

    // Deduct allocation balance if required
    if (request.requires_allocation && request.allocation_id) {
      const [[allocation]] = await connection.execute(
        'SELECT remaining_days, taken_days FROM time_off_allocations WHERE id = ? FOR UPDATE',
        [request.allocation_id]
      );

      if (allocation.remaining_days < request.duration) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot approve: Remaining balance (${allocation.remaining_days}) is less than requested (${request.duration}).`
        });
      }

      await connection.execute(
        `UPDATE time_off_allocations SET 
          taken_days = taken_days + ?, 
          remaining_days = remaining_days - ? 
         WHERE id = ?`,
        [request.duration, request.duration, request.allocation_id]
      );
    }

    await connection.execute(
      'UPDATE time_off_requests SET status = "APPROVED", approved_by_user_id = ? WHERE id = ?',
      [req.user.id, requestId]
    );

    await connection.commit();
    res.status(200).json({ success: true, message: 'Leave request approved and balance consumed' });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// Refuse request
exports.refuseRequest = async (req, res) => {
  try {
    const { refusal_reason } = req.body;
    await pool.execute(
      'UPDATE time_off_requests SET status = "REFUSED", refusal_reason = ?, approved_by_user_id = ? WHERE id = ?',
      [refusal_reason || 'Disapproved by manager', req.user.id, req.params.id]
    );
    res.status(200).json({ success: true, message: 'Leave request refused' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

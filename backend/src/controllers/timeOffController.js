const { pool } = require('../config/db');

// --- 1. TIME OFF TYPES ---
exports.getTypes = async (req, res) => {
  try {
    const [types] = await pool.execute('SELECT * FROM time_off_types WHERE is_active = 1 ORDER BY id ASC');
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
    }
    if (status) {
      query += ' AND toa.status = ?';
      params.push(status);
    }
    if (req.user && req.user.role === 'EMPLOYEE') {
      const userEmpId = req.user.employeeId || req.user.employee?.id;
      if (userEmpId) {
        query += ' AND toa.employee_id = ?';
        params.push(userEmpId);
      }
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
    }
    if (status) {
      query += ' AND tor.status = ?';
      params.push(status);
    }
    if (req.user && req.user.role === 'EMPLOYEE') {
      const userEmpId = req.user.employeeId || req.user.employee?.id;
      if (userEmpId) {
        query += ' AND tor.employee_id = ?';
        params.push(userEmpId);
      }
    }

    query += ' ORDER BY FIELD(tor.status, "SUBMITTED", "DRAFT") DESC, tor.id DESC';

    const [requests] = await pool.execute(query, params);
    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit request
exports.createRequest = async (req, res) => {
  try {
    let { employee_id, time_off_type_id, date_from, date_to, duration, reason,
          employeeId, timeOffTypeId, startDate, endDate, numberOfDays } = req.body;

    employee_id = employee_id || employeeId;
    time_off_type_id = time_off_type_id || timeOffTypeId;
    date_from = date_from || startDate;
    date_to = date_to || endDate;
    duration = duration || numberOfDays || 1;

    if (req.user && req.user.role === 'EMPLOYEE') {
      employee_id = req.user.employeeId || req.user.employee?.id || employee_id;
    }

    // Check type requirement
    const [[type]] = await pool.execute('SELECT * FROM time_off_types WHERE id = ?', [time_off_type_id]);
    if (!type || !type.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave type. Only Paid Annual Leave and Paid Sick Leave are allowed.'
      });
    }
    let allocationId = null;

    if (type && type.requires_allocation) {
      // Find approved allocation with remaining balance
      const [allocations] = await pool.execute(
        `SELECT id, remaining_days FROM time_off_allocations 
         WHERE employee_id = ? AND time_off_type_id = ? AND status = 'APPROVED' 
         ORDER BY id DESC LIMIT 1`,
        [employee_id, time_off_type_id]
      );

      if (allocations.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No approved leave allocation found for ${type.name}. Please contact HR.`
        });
      }

      if (parseFloat(allocations[0].remaining_days) < parseFloat(duration)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance: You have ${allocations[0].remaining_days} days remaining for ${type.name}, but requested ${duration} days.`
        });
      }

      allocationId = allocations[0].id;
    }

    const [result] = await pool.execute(
      `INSERT INTO time_off_requests (employee_id, time_off_type_id, allocation_id, date_from, date_to, duration, reason, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [employee_id, time_off_type_id, allocationId, date_from, date_to, duration, reason || null]
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

    // Deduct allocation balance if required and allocation exists
    if (request.requires_allocation) {
      let allocId = request.allocation_id;
      if (!allocId) {
        const [avail] = await connection.execute(
          `SELECT id FROM time_off_allocations 
           WHERE employee_id = ? AND time_off_type_id = ? AND status = 'APPROVED' 
           ORDER BY id DESC LIMIT 1`,
          [request.employee_id, request.time_off_type_id]
        );
        if (avail.length > 0) {
          allocId = avail[0].id;
          await connection.execute('UPDATE time_off_requests SET allocation_id = ? WHERE id = ?', [allocId, requestId]);
        }
      }

      if (allocId) {
        const [[allocation]] = await connection.execute(
          'SELECT remaining_days, taken_days FROM time_off_allocations WHERE id = ? FOR UPDATE',
          [allocId]
        );

        if (allocation && parseFloat(allocation.remaining_days) < parseFloat(request.duration)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Cannot approve: Remaining balance (${allocation.remaining_days} days) is less than requested (${request.duration} days).`
          });
        }

        if (allocation) {
          await connection.execute(
            `UPDATE time_off_allocations SET 
              taken_days = taken_days + ?, 
              remaining_days = remaining_days - ? 
             WHERE id = ?`,
            [request.duration, request.duration, allocId]
          );
        }
      }
    }

    const approverUserId = req.user?.id || null;
    await connection.execute(
      'UPDATE time_off_requests SET status = "APPROVED", approved_by_user_id = ? WHERE id = ?',
      [approverUserId, requestId]
    );

    await connection.commit();
    res.status(200).json({ success: true, message: 'Leave request approved successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// Refuse request
exports.refuseRequest = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const requestId = req.params.id;
    const { refusal_reason } = req.body || {};

    const [[request]] = await connection.execute(
      'SELECT * FROM time_off_requests WHERE id = ?',
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // If it was previously APPROVED and had an allocation, restore balance
    if (request.status === 'APPROVED' && request.allocation_id) {
      await connection.execute(
        `UPDATE time_off_allocations SET 
          taken_days = GREATEST(0, taken_days - ?), 
          remaining_days = remaining_days + ? 
         WHERE id = ?`,
        [request.duration, request.duration, request.allocation_id]
      );
    }

    const reviewerUserId = req.user?.id || null;
    await connection.execute(
      'UPDATE time_off_requests SET status = "REFUSED", refusal_reason = ?, approved_by_user_id = ? WHERE id = ?',
      [refusal_reason || 'Disapproved by manager', reviewerUserId, requestId]
    );

    await connection.commit();
    res.status(200).json({ success: true, message: 'Leave request refused' });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// Generic status update (maps to approve or refuse)
exports.updateRequestStatus = async (req, res) => {
  const { status } = req.body || {};
  const upperStatus = String(status || '').toUpperCase();
  if (upperStatus === 'APPROVED') {
    return exports.approveRequest(req, res);
  } else if (upperStatus === 'REFUSED') {
    return exports.refuseRequest(req, res);
  } else {
    try {
      await pool.execute('UPDATE time_off_requests SET status = ? WHERE id = ?', [upperStatus, req.params.id]);
      res.status(200).json({ success: true, message: `Request status updated to ${upperStatus}` });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }
};

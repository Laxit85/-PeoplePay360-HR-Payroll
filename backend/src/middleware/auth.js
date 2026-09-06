const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'peoplepay360_secret_jwt_2026');

    const [users] = await pool.query(
      `SELECT u.id, u.email, u.is_active, r.name AS role, u.role_id, e.id AS employeeId, e.first_name, e.last_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       LEFT JOIN employees e ON (e.user_id = u.id OR e.email = u.email)
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = users[0];
    req.user.employeeId = users[0].employeeId || decoded.employeeId || null;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Authorize roles (RBAC)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const userRole = String(req.user.role || '').toUpperCase();
    if (userRole === 'ADMIN') {
      return next();
    }
    const normalized = roles.map((r) => String(r).toUpperCase());
    if (!normalized.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

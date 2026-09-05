const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'peoplepay360_secret_jwt_2026');

    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.is_active, r.name AS role, u.role_id 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Authorize roles (RBAC)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

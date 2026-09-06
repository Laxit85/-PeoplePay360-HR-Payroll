// src/middleware/rbac.middleware.js
// Owner: Person 1
// Usage: router.get('/', authenticate, authorize('hr_manager','admin'), handler)

function authorize(...allowedRoles) {
  const normalized = allowedRoles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userRole = String(req.user.role || '').toLowerCase();
    if (!normalized.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = authorize;

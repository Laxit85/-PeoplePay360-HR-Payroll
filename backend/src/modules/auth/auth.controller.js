// src/modules/auth/auth.controller.js
// Owner: Person 1

const authService = require('./auth.service');

async function register(req, res, next) {
  try {
    const { email, password, role, employeeId } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'email, password, and role are required', message: 'email, password, and role are required' });
    }
    const existing = await authService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered', message: 'Email already registered' });
    }
    const user = await authService.createUser({ email, password, role, employeeId });
    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials', message: 'Invalid credentials' });
    }
    const valid = await authService.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials', message: 'Invalid credentials' });
    }
    const token = authService.signToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee || null
      }
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  // req.user was set by the `authenticate` middleware
  res.json({
    success: true,
    user: {
      ...req.user,
      employee: req.user.employee || null
    }
  });
}

module.exports = { register, login, me };

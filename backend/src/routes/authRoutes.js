const express = require('express');
const { register, login, getMe, getUsers, createUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Admin User Management
router.get('/users', protect, authorize('ADMIN'), getUsers);
router.post('/users', protect, authorize('ADMIN'), createUser);

module.exports = router;

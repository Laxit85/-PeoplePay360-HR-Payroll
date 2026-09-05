// src/modules/attendance/attendance.routes.js
// Owner: Person 3 — mounted at /api/attendance

const express = require('express');
const router = express.Router();
const controller = require('./attendance.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

router.get('/', authenticate, authorize('hr_manager', 'admin'), controller.list);
router.post('/check-in', authenticate, controller.checkIn);
router.post('/check-out', authenticate, controller.checkOut);

module.exports = router;

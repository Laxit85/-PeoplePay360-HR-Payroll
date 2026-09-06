// src/modules/attendance/attendance.routes.js
// Owner: Person 3 — mounted at /api/attendance

const express = require('express');
const router = express.Router();
const controller = require('./attendance.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

router.get('/stats', authenticate, controller.getStats);
router.post('/clock', authenticate, controller.clock);
router.get('/', authenticate, controller.list);
router.post('/check-in', authenticate, controller.checkIn);
router.post('/check-out', authenticate, controller.checkOut);

module.exports = router;

// src/modules/employee/schedule.routes.js
// Owner: Person 2 — mounted at /api/schedules

const express = require('express');
const router = express.Router();
const controller = require('./schedule.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

router.get('/:employeeId', authenticate, controller.getByEmployee);
router.put('/:employeeId', authenticate, authorize('hr_manager', 'admin'), controller.upsert);

module.exports = router;

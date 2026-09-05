// src/modules/dashboard/dashboard.routes.js
// Owner: Everyone — mounted at /api/dashboard

const express = require('express');
const router = express.Router();
const controller = require('./dashboard.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

router.get('/headcount', authenticate, authorize('hr_manager', 'admin'), controller.headcount);
router.get('/attendance-exceptions', authenticate, authorize('hr_manager', 'admin'), controller.attendanceExceptions);
router.get('/payroll-cost', authenticate, authorize('payroll_officer', 'admin'), controller.payrollCost);
router.get('/leave-usage', authenticate, authorize('hr_manager', 'admin'), controller.leaveUsage);

module.exports = router;

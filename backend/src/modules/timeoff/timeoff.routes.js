// src/modules/timeoff/timeoff.routes.js
// Owner: Person 3 — mounted at /api/timeoff

const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

const typeController = require('./timeoffType.controller');
const allocationController = require('./timeoffAllocation.controller');
const requestController = require('./timeoffRequest.controller');

// Leave policy config
router.get('/types', authenticate, typeController.list);
router.post('/types', authenticate, authorize('hr_manager', 'admin'), typeController.create);

// Employee balances
router.get('/allocations/:employeeId', authenticate, allocationController.getByEmployee);
router.post('/allocations', authenticate, authorize('hr_manager', 'admin'), allocationController.create);

// Requests + approval workflow
router.post('/requests', authenticate, requestController.create);
router.post('/requests/:id/approve', authenticate, authorize('hr_manager', 'admin'), requestController.approve);
router.post('/requests/:id/refuse', authenticate, authorize('hr_manager', 'admin'), requestController.refuse);

module.exports = router;

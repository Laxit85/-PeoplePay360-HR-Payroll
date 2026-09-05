// src/modules/employee/contract.routes.js
// Owner: Person 2 — mounted at /api/contracts

const express = require('express');
const router = express.Router();
const controller = require('./contract.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

router.get('/', authenticate, authorize('hr_manager', 'admin', 'payroll_officer'), controller.list);
router.post('/', authenticate, authorize('hr_manager', 'admin'), controller.create);

module.exports = router;

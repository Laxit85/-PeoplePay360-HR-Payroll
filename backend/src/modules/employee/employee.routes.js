// src/modules/employee/employee.routes.js
// Owner: Person 2 — mounted at /api/employees

const express = require('express');
const router = express.Router();
const controller = require('./employee.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

router.get('/', authenticate, authorize('hr_manager', 'admin'), controller.list);
router.get('/:id', authenticate, authorize('hr_manager', 'admin', 'employee'), controller.getById);
router.post('/', authenticate, authorize('hr_manager', 'admin'), controller.create);
router.put('/:id', authenticate, authorize('hr_manager', 'admin'), controller.update);

module.exports = router;

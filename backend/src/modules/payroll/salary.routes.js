// src/modules/payroll/salary.routes.js
// Owner: Person 4 — mounted at /api/salary

const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const ruleController = require('./salaryRule.controller');
const structureController = require('./salaryStructure.controller');

router.get('/rules', authenticate, ruleController.list);
router.post('/rules', authenticate, authorize('payroll_officer', 'admin'), ruleController.create);

router.get('/structures', authenticate, structureController.list);
router.post('/structures', authenticate, authorize('payroll_officer', 'admin'), structureController.create);
router.get('/structures/:id/rules', authenticate, structureController.getRules);

module.exports = router;

// src/modules/payroll/payrun.routes.js
// Owner: Person 4 — mounted at /api/payruns

const express = require('express');
const router = express.Router();
const controller = require('./payrun.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

router.post('/', authenticate, authorize('payroll_officer', 'admin'), controller.create);
router.post('/:id/compute', authenticate, authorize('payroll_officer', 'admin'), controller.compute);
router.post('/:id/validate', authenticate, authorize('payroll_officer', 'admin'), controller.validate);
router.post('/:id/pay', authenticate, authorize('payroll_officer', 'admin'), controller.markPaid);

module.exports = router;

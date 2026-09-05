// src/modules/payroll/payslip.routes.js
// Owner: Person 4 — mounted at /api/payslips

const express = require('express');
const router = express.Router();
const controller = require('./payslip.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');

router.get('/payrun/:payrunId', authenticate, authorize('payroll_officer', 'admin'), controller.listByPayrun);
router.get('/:id/pdf', authenticate, controller.downloadPdf);
router.post('/payrun/:payrunId/send', authenticate, authorize('payroll_officer', 'admin'), controller.sendForPayrun);

module.exports = router;

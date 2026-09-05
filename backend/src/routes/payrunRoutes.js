const express = require('express');
const {
  getEligibleEmployees,
  createPayrun,
  getPayruns,
  getPayrunById,
  computePayrun,
  validatePayrun,
  markPaid,
  printPayslipPDF,
  sendPayslips
} = require('../controllers/payrunController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Wizard Step 2: filter eligible employees
router.get('/eligible-employees', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), getEligibleEmployees);

// Payrun collection
router.route('/')
  .get(protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), getPayruns)
  .post(protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), createPayrun);

// Payrun lifecycle actions
router.get('/:id', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), getPayrunById);
router.post('/:id/compute', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), computePayrun);
router.post('/:id/validate', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), validatePayrun);
router.post('/:id/mark-paid', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), markPaid);
router.post('/:id/send-payslips', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), sendPayslips);

// Individual PDF payslip
router.get('/payslips/:id/pdf', protect, printPayslipPDF);

module.exports = router;

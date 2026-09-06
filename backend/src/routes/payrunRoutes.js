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
  getPayslipById,
  getMyLatestPayslip,
  getMyPayslips,
  sendPayslips,
  triggerMonthlyDistribution,
  testEmailDelivery,
  deletePayrun
} = require('../controllers/payrunController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// End-of-month and diagnostic email delivery triggers
router.post('/distribute-monthly', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), triggerMonthlyDistribution);
router.post('/test-email', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), testEmailDelivery);

// Wizard Step 2: filter eligible employees
router.get('/eligible-employees', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), getEligibleEmployees);

// Payrun collection
router.route('/')
  .get(protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), getPayruns)
  .post(protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), createPayrun);

// Employee self-service payslip endpoints
router.get('/my-latest-payslip', protect, getMyLatestPayslip);
router.get('/my-payslips', protect, getMyPayslips);

// Individual Payslip JSON & PDF
router.get('/payslips/:id', protect, getPayslipById);
router.get('/payslips/:id/pdf', protect, printPayslipPDF);

// Payrun lifecycle actions
router.get('/:id', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), getPayrunById);
router.delete('/:id', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), deletePayrun);
router.post('/:id/compute', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), computePayrun);
router.post('/:id/process', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), computePayrun);
router.post('/:id/validate', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), validatePayrun);
router.post('/:id/mark-paid', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), markPaid);
router.post('/:id/send-payslips', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), sendPayslips);

module.exports = router;


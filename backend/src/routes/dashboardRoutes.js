const express = require('express');
const { getDashboardMetrics } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), getDashboardMetrics);
router.get('/stats', protect, authorize('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), getDashboardMetrics);

module.exports = router;

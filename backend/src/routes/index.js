// src/routes/index.js
const express = require('express');
const router = express.Router();

// Core and Extended API Routes
router.use('/auth', require('./authRoutes'));
router.use('/employees', require('./employeeRoutes'));
router.use('/contracts', require('./contractRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/time-off', require('./timeOffRoutes'));
router.use('/timeoff', require('./timeOffRoutes'));
router.use('/schedules', require('./scheduleRoutes'));
router.use('/working-schedules', require('./scheduleRoutes'));
const { getPayslipById, printPayslipPDF } = require('../controllers/payrunController');
const { protect } = require('../middleware/auth');

router.use('/payruns', require('./payrunRoutes'));
router.get('/payslips/:id', protect, getPayslipById);
router.get('/payslips/:id/pdf', protect, printPayslipPDF);
router.use('/salary-structures', require('./salaryStructureRoutes'));
router.use('/salary', require('./salaryStructureRoutes'));
router.use('/org', require('./orgRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));

module.exports = router;

// src/routes/index.js
const express = require('express');
const router = express.Router();

// Modular Routes (Purva & Team)
router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/employees', require('../modules/employee/employee.routes'));
router.use('/contracts', require('../modules/employee/contract.routes'));
router.use('/schedules', require('../modules/employee/schedule.routes'));
router.use('/attendance', require('../modules/attendance/attendance.routes'));
router.use('/timeoff', require('../modules/timeoff/timeoff.routes'));
router.use('/salary', require('../modules/payroll/salary.routes'));
router.use('/payruns', require('../modules/payroll/payrun.routes'));
router.use('/payslips', require('../modules/payroll/payslip.routes'));
router.use('/dashboard', require('../modules/dashboard/dashboard.routes'));

// Additional / Extended Routes (Vasudev)
router.use('/org', require('./orgRoutes'));
router.use('/working-schedules', require('./scheduleRoutes'));
router.use('/time-off', require('./timeOffRoutes'));
router.use('/salary-structures', require('./salaryStructureRoutes'));

module.exports = router;

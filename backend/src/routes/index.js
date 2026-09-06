// src/routes/index.js
const express = require('express');
const router = express.Router();

// 1. Authentication & Me
router.use('/auth', require('./authRoutes'));

// 2. User Management (Admin only)
router.use('/users', require('./userRoutes'));

// 3. Organization & Departments
router.use('/org', require('./orgRoutes'));
router.use('/departments', require('./orgRoutes'));

// 4. Employees & Contracts
router.use('/employees', require('./employeeRoutes'));
router.use('/contracts', require('./contractRoutes'));

// 5. Schedules & Shifts (support both /schedules and /working-schedules)
router.use('/schedules', require('./scheduleRoutes'));
router.use('/working-schedules', require('./scheduleRoutes'));

// 6. Attendance & Clocking
router.use('/attendance', require('./attendanceRoutes'));

// 7. Time Off / Leave (support both /time-off and /timeoff)
router.use('/time-off', require('./timeOffRoutes'));
router.use('/timeoff', require('./timeOffRoutes'));

// 8. Salary Structures & Rules (support both /salary-structures and /salary)
router.use('/salary-structures', require('./salaryStructureRoutes'));
router.use('/salary', require('./salaryStructureRoutes'));

// 9. Payruns & Payslips
router.use('/payruns', require('./payrunRoutes'));
router.use('/payslips', require('./payrunRoutes'));

// 10. Dashboard & Analytics
router.use('/dashboard', require('./dashboardRoutes'));

module.exports = router;

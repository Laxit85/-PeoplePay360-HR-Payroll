// src/routes/index.js
// Ground rule: each person adds ONLY their own line here. Don't touch
// anyone else's line.

const express = require('express');
const router = express.Router();

router.use('/auth', require('../modules/auth/auth.routes'));                 // Person 1
router.use('/employees', require('../modules/employee/employee.routes'));    // Person 2
router.use('/contracts', require('../modules/employee/contract.routes'));    // Person 2
router.use('/schedules', require('../modules/employee/schedule.routes'));    // Person 2
router.use('/attendance', require('../modules/attendance/attendance.routes')); // Person 3
router.use('/timeoff', require('../modules/timeoff/timeoff.routes'));        // Person 3
router.use('/salary', require('../modules/payroll/salary.routes'));          // Person 4
router.use('/payruns', require('../modules/payroll/payrun.routes'));         // Person 4
router.use('/payslips', require('../modules/payroll/payslip.routes'));       // Person 4
router.use('/dashboard', require('../modules/dashboard/dashboard.routes'));  // Everyone

module.exports = router;

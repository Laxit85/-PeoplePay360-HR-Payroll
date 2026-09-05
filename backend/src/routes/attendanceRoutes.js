const express = require('express');
const {
  getAttendances,
  checkIn,
  checkOut,
  correctAttendance,
  deleteAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getAttendances);
router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.put('/:id/correct', protect, authorize('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'), correctAttendance);
router.delete('/:id', protect, authorize('ADMIN'), deleteAttendance);

module.exports = router;

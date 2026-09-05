const express = require('express');
const {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getSchedules)
  .post(protect, authorize('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), createSchedule);

router.get('/shifts', protect, getSchedules);

router.route('/:id')
  .get(protect, getScheduleById)
  .put(protect, authorize('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), updateSchedule)
  .delete(protect, authorize('ADMIN'), deleteSchedule);

module.exports = router;

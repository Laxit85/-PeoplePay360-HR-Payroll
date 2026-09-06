const express = require('express');
const {
  getDepartments,
  createDepartment,
  getJobPositions,
  createJobPosition,
  getRoles,
  getBranches
} = require('../controllers/orgController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/departments')
  .get(protect, getDepartments)
  .post(protect, authorize('HR_MANAGER', 'ADMIN'), createDepartment);

router.route('/job-positions')
  .get(protect, getJobPositions)
  .post(protect, authorize('HR_MANAGER', 'ADMIN'), createJobPosition);

router.get('/roles', protect, getRoles);
router.get('/branches', protect, getBranches);

module.exports = router;


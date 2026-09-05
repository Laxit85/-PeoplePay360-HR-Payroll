const express = require('express');
const {
  getTypes,
  createType,
  getAllocations,
  createAllocation,
  approveAllocation,
  getRequests,
  createRequest,
  approveRequest,
  refuseRequest
} = require('../controllers/timeOffController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/types')
  .get(protect, getTypes)
  .post(protect, authorize('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'), createType);

router.route('/allocations')
  .get(protect, getAllocations)
  .post(protect, authorize('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'), createAllocation);

router.put('/allocations/:id/approve', protect, authorize('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'), approveAllocation);

router.route('/requests')
  .get(protect, getRequests)
  .post(protect, createRequest);

router.put('/requests/:id/approve', protect, authorize('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'), approveRequest);
router.put('/requests/:id/refuse', protect, authorize('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'), refuseRequest);

module.exports = router;

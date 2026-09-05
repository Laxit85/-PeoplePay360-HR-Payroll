const express = require('express');
const {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract
} = require('../controllers/contractController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getContracts)
  .post(protect, authorize('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), createContract);

router.route('/:id')
  .get(protect, getContractById)
  .put(protect, authorize('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), updateContract)
  .delete(protect, authorize('ADMIN'), deleteContract);

module.exports = router;

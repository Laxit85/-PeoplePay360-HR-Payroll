const express = require('express');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getEmployees)
  .post(protect, authorize('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'), createEmployee);

router.route('/:id')
  .get(protect, getEmployeeById)
  .put(protect, updateEmployee)
  .delete(protect, authorize('ADMIN'), deleteEmployee);

module.exports = router;

const express = require('express');
const {
  getStructures,
  getStructureById,
  createStructure,
  addOrUpdateRule,
  deleteRule,
  getAllRules,
  saveSalaryRule
} = require('../controllers/salaryStructureController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Rules collection routes (must be before /:id)
router.route('/rules')
  .get(protect, getAllRules)
  .post(protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), saveSalaryRule);

router.route('/')
  .get(protect, getStructures)
  .post(protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), createStructure);

router.route('/:id')
  .get(protect, getStructureById);

router.post('/:id/rules', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), addOrUpdateRule);
router.delete('/:id/rules/:ruleId', protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), deleteRule);

module.exports = router;

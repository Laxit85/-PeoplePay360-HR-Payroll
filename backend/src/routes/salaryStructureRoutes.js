const express = require('express');
const {
  getStructures,
  getStructureById,
  createStructure,
  addOrUpdateRule,
  deleteRule
} = require('../controllers/salaryStructureController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getStructures)
  .post(protect, authorize('HR_PAYROLL_MANAGER', 'ADMIN'), createStructure);

router.route('/:id')
  .get(protect, getStructureById);

router.post('/:id/rules', protect, authorize('ADMIN'), addOrUpdateRule);
router.delete('/:id/rules/:ruleId', protect, authorize('ADMIN'), deleteRule);

module.exports = router;

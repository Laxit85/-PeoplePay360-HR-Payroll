const express = require('express');
const {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('ADMIN'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser);

router.put('/:id/toggle-status', toggleUserStatus);

module.exports = router;

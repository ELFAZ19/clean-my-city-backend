const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateProfileUpdate, validatePasswordChange } = require('../middleware/validation');
const { USER_ROLES } = require('../config/constants');

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, validateProfileUpdate, userController.updateProfile);
router.put('/password', authenticate, validatePasswordChange, userController.changePassword);

// Admin-only routes
router.get('/', authenticate, authorize([USER_ROLES.ADMIN]), userController.getAllUsers);
router.put('/:id/toggle-active', authenticate, authorize([USER_ROLES.ADMIN]), userController.toggleUserActive);
router.delete('/:id', authenticate, authorize([USER_ROLES.ADMIN]), userController.deleteUser);

module.exports = router;

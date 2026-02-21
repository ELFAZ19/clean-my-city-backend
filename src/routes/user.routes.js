/**
 * User Routes
 * Protected routes for user profile management
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validateProfileUpdate, validatePasswordChange } = require('../middleware/validation');

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private (All authenticated users)
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private (All authenticated users)
 */
router.put('/profile', authenticate, validateProfileUpdate, userController.updateProfile);

/**
 * @route   PUT /api/users/password
 * @desc    Change password
 * @access  Private (All authenticated users)
 */
router.put('/password', authenticate, validatePasswordChange, userController.changePassword);

module.exports = router;

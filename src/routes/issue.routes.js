/**
 * Issue Routes
 * Protected routes for issue management
 */

const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateStatusUpdate, validateIssueCreation } = require('../middleware/validation');
const { USER_ROLES } = require('../config/constants');
const upload = require('../config/upload');

/**
 * @route   POST /api/issues
 * @desc    Create a new issue with image upload (with duplicate detection)
 * @access  Private (Citizens only)
 */
router.post(
    '/',
    authenticate,
    authorize([USER_ROLES.CITIZEN]),
    upload.single('image'), // Handle single image upload with field name 'image'
    validateIssueCreation,
    issueController.createIssue
);

/**
 * @route   GET /api/issues/my-issues
 * @desc    Get current user's issues
 * @access  Private (Citizens only)
 */
router.get(
    '/my-issues',
    authenticate,
    authorize([USER_ROLES.CITIZEN]),
    issueController.getMyIssues
);

/**
 * @route   GET /api/issues/queue
 * @desc    Get authority's (organization) issue queue
 * @access  Private (Authorities only)
 */
router.get(
    '/queue',
    authenticate,
    authorize([USER_ROLES.AUTHORITY]),
    issueController.getOrganizationQueue
);

/**
 * @route   PUT /api/issues/:id/status
 * @desc    Update issue status
 * @access  Private (Authorities only)
 */
router.put(
    '/:id/status',
    authenticate,
    authorize([USER_ROLES.AUTHORITY]),
    validateStatusUpdate,
    issueController.updateIssueStatus
);

/**
 * @route   GET /api/issues/:id
 * @desc    Get issue by ID
 * @access  Private (Owner or assigned authority)
 */
router.get(
    '/:id',
    authenticate,
    issueController.getIssueById
);

module.exports = router;

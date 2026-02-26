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
 * @route   GET /api/issues/all
 * @desc    Get all issues globally
 * @access  Private (Admin only)
 */
router.get(
    '/all',
    authenticate,
    authorize([USER_ROLES.ADMIN]),
    issueController.getAllIssues
);

/**
 * @route   GET /api/issues/analytics/global
 * @desc    Aggregated analytics across all issues (admin)
 * @access  Private (Admin only)
 */
router.get(
    '/analytics/global',
    authenticate,
    authorize([USER_ROLES.ADMIN]),
    issueController.getGlobalAnalytics
);

/**
 * @route   GET /api/issues/analytics/organization
 * @desc    Aggregated analytics for current authority's organization
 * @access  Private (Authorities only)
 */
router.get(
    '/analytics/organization',
    authenticate,
    authorize([USER_ROLES.AUTHORITY]),
    issueController.getOrganizationAnalytics
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
 * @route   DELETE /api/issues/:id
 * @desc    Delete an issue (authority can only delete issues in their organization)
 * @access  Private (Authorities only)
 */
router.delete(
    '/:id',
    authenticate,
    authorize([USER_ROLES.AUTHORITY]),
    issueController.deleteIssue
);

/**
 * @route   GET /api/issues/:id/image
 * @desc    Get issue image
 * @access  Private (Owner or assigned authority)
 */
router.get(
    '/:id/image',
    authenticate,
    issueController.getIssueImage
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

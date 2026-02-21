/**
 * Organization Routes
 * Protected routes for organization management
 */

const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateOrganizationCreation } = require('../middleware/validation');
const { USER_ROLES } = require('../config/constants');

/**
 * PUBLIC ENDPOINT - Citizens can view active organizations
 * @route   GET /api/organizations/public
 * @desc    Get list of active organizations (for citizens to select when creating issues)
 * @access  Public (no authentication required)
 */
router.get('/public', organizationController.getPublicOrganizations);

/**
 * @route   POST /api/organizations
 * @desc    Create a new organization
 * @access  Private (Admin only)
 */
router.post(
    '/',
    authenticate,
    authorize([USER_ROLES.ADMIN]),
    validateOrganizationCreation,
    organizationController.createOrganization
);

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization
 * @access  Private (Admin only)
 */
router.put(
    '/:id',
    authenticate,
    authorize([USER_ROLES.ADMIN]),
    organizationController.updateOrganization
);

/**
 * @route   PUT /api/organizations/:id/activate
 * @desc    Activate organization
 * @access  Private (Admin only)
 */
router.put(
    '/:id/activate',
    authenticate,
    authorize([USER_ROLES.ADMIN]),
    organizationController.activateOrganization
);

/**
 * @route   PUT /api/organizations/:id/deactivate
 * @desc    Deactivate organization
 * @access  Private (Admin only)
 */
router.put(
    '/:id/deactivate',
    authenticate,
    authorize([USER_ROLES.ADMIN]),
    organizationController.deactivateOrganization
);

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations
 * @access  Private (Admin only)
 */
router.get(
    '/',
    authenticate,
    authorize([USER_ROLES.ADMIN]),
    organizationController.getAllOrganizations
);

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization by ID
 * @access  Private (Admin only)
 */
router.get(
    '/:id',
    authenticate,
    authorize([USER_ROLES.ADMIN]),
    organizationController.getOrganizationById
);

module.exports = router;

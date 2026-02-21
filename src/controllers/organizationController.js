/**
 * Organization Controller
 * Handles organization management (Admin only)
 */

const organizationService = require('../services/organizationService');

/**
 * Create a new organization
 * POST /api/organizations
 */
const createOrganization = async (req, res, next) => {
    try {
        const organization = await organizationService.createOrganization(req.body);

        res.status(201).json({
            success: true,
            message: 'Organization created successfully',
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update organization
 * PUT /api/organizations/:id
 */
const updateOrganization = async (req, res, next) => {
    try {
        const orgId = parseInt(req.params.id);
        const organization = await organizationService.updateOrganization(orgId, req.body);

        res.status(200).json({
            success: true,
            message: 'Organization updated successfully',
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Activate organization
 * PUT /api/organizations/:id/activate
 */
const activateOrganization = async (req, res, next) => {
    try {
        const orgId = parseInt(req.params.id);
        const organization = await organizationService.activateOrganization(orgId);

        res.status(200).json({
            success: true,
            message: 'Organization activated successfully',
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Deactivate organization
 * PUT /api/organizations/:id/deactivate
 */
const deactivateOrganization = async (req, res, next) => {
    try {
        const orgId = parseInt(req.params.id);
        const organization = await organizationService.deactivateOrganization(orgId);

        res.status(200).json({
            success: true,
            message: 'Organization deactivated successfully',
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get all organizations
 * GET /api/organizations
 */
const getAllOrganizations = async (req, res, next) => {
    try {
        const activeOnly = req.query.active === 'true';
        const organizations = await organizationService.getAllOrganizations(activeOnly);

        res.status(200).json({
            success: true,
            data: {
                count: organizations.length,
                organizations
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get organization by ID
 * GET /api/organizations/:id
 */
const getOrganizationById = async (req, res, next) => {
    try {
        const orgId = parseInt(req.params.id);
        const organization = await organizationService.getOrganizationById(orgId);

        res.status(200).json({
            success: true,
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get public organizations list (for citizens)
 * GET /api/organizations/public
 * Returns only active organizations with basic info (no login credentials)
 */
const getPublicOrganizations = async (req, res, next) => {
    try {
        const organizations = await organizationService.getPublicOrganizations();

        res.status(200).json({
            success: true,
            data: {
                count: organizations.length,
                organizations
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrganization,
    updateOrganization,
    activateOrganization,
    deactivateOrganization,
    getAllOrganizations,
    getOrganizationById,
    getPublicOrganizations
};

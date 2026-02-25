/**
 * Issue Controller
 * Handles issue creation, viewing, and status updates
 */

const issueService = require('../services/issueService');
const { pool } = require('../config/database');
const { USER_ROLES } = require('../config/constants');

/**
 * Create a new issue (with duplicate detection and image upload)
 * POST /api/issues
 * 
 * Accepts multipart/form-data with:
 * - title (string, required)
 * - description (string, required)
 * - organization_id (integer, required)
 * - latitude (number, optional)
 * - longitude (number, optional)
 * - image (file, optional) - actual image file
 */
const createIssue = async (req, res, next) => {
    try {
        // Parse form data
        const issueData = {
            title: req.body.title,
            description: req.body.description,
            organization_id: parseInt(req.body.organization_id),
            latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
            longitude: req.body.longitude ? parseFloat(req.body.longitude) : null
        };

        // If image was uploaded, add the buffer and mimetype
        if (req.file) {
            issueData.image_buffer = req.file.buffer;
            issueData.image_mime_type = req.file.mimetype;
        }

        // Validate required fields
        if (!issueData.title || issueData.title.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Title is required and must be at least 5 characters'
            });
        }

        if (!issueData.description || issueData.description.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Description is required and must be at least 10 characters'
            });
        }

        if (!issueData.organization_id) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }

        const result = await issueService.createIssue(issueData, req.user.id);

        // If duplicate found, return 200 with duplicate info
        if (result.isDuplicate) {
            return res.status(200).json({
                success: true,
                isDuplicate: true,
                message: result.message,
                data: {
                    existingIssue: result.existingIssue
                }
            });
        }

        // New issue created
        res.status(201).json({
            success: true,
            isDuplicate: false,
            message: result.message,
            data: {
                issue: result.issue
            }
        });

    } catch (error) {
        // Handle multer errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Image file too large. Maximum size is 5MB.'
            });
        }
        next(error);
    }
};

/**
 * Get current user's issues
 * GET /api/issues/my-issues
 */
const getMyIssues = async (req, res, next) => {
    try {
        const issues = await issueService.getUserIssues(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                count: issues.length,
                issues
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get organization's issue queue
 * GET /api/issues/queue
 */
const getOrganizationQueue = async (req, res, next) => {
    try {
        // Get organization ID for current user
        const [organizations] = await pool.query(
            'SELECT id FROM organizations WHERE user_id = $1',
            [req.user.id]
        );

        if (organizations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found for this user'
            });
        }

        const organizationId = organizations[0].id;
        const status = req.query.status || null;

        const issues = await issueService.getOrganizationIssues(organizationId, status);

        res.status(200).json({
            success: true,
            data: {
                organization_id: organizationId,
                filter: status || 'all',
                count: issues.length,
                issues
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update issue status
 * PUT /api/issues/:id/status
 */
const updateIssueStatus = async (req, res, next) => {
    try {
        // Get organization ID for current user
        const [organizations] = await pool.query(
            'SELECT id FROM organizations WHERE user_id = $1',
            [req.user.id]
        );

        if (organizations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found for this user'
            });
        }

        const organizationId = organizations[0].id;
        const issueId = parseInt(req.params.id);
        const { status } = req.body;

        const issue = await issueService.updateIssueStatus(issueId, status, organizationId);

        res.status(200).json({
            success: true,
            message: 'Issue status updated successfully',
            data: { issue }
        });

    } catch (error) {
        next(error);
    }
};

const getIssueById = async (req, res, next) => {
    try {
        const issueId = parseInt(req.params.id);
        const issue = await issueService.getIssueById(issueId, req.user.id, req.user.role);

        res.status(200).json({
            success: true,
            data: { issue }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get issue image
 * GET /api/issues/:id/image
 */
const getIssueImage = async (req, res, next) => {
    try {
        const issueId = parseInt(req.params.id);
        const { buffer, mimeType } = await issueService.getIssueImageData(
            issueId,
            req.user.id,
            req.user.role
        );

        res.set('Content-Type', mimeType);
        res.set('Cache-Control', 'private, max-age=86400'); // Cache for 24 hours
        res.send(buffer);

    } catch (error) {
        next(error);
    }
};

const getAllIssues = async (req, res, next) => {
    try {
        const issues = await issueService.getAllIssues();
        res.status(200).json({
            success: true,
            data: { count: issues.length, issues }
        });
    } catch (error) { next(error); }
};

const getGlobalAnalytics = async (req, res, next) => {
    try {
        if (req.user.role !== USER_ROLES.ADMIN) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const range = parseInt(req.query.range, 10) || 30;
        const analytics = await issueService.getGlobalAnalytics(range);
        res.status(200).json({ success: true, data: analytics });
    } catch (error) {
        next(error);
    }
};

const getOrganizationAnalytics = async (req, res, next) => {
    try {
        if (req.user.role !== USER_ROLES.AUTHORITY) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const [organizations] = await pool.query(
            'SELECT id FROM organizations WHERE user_id = $1',
            [req.user.id]
        );

        if (organizations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found for this user'
            });
        }

        const organizationId = organizations[0].id;
        const range = parseInt(req.query.range, 10) || 30;
        const analytics = await issueService.getOrganizationAnalytics(organizationId, range);

        res.status(200).json({
            success: true,
            data: { organization_id: organizationId, ...analytics }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createIssue,
    getMyIssues,
    getOrganizationQueue,
    updateIssueStatus,
    getIssueById,
    getIssueImage,
    getAllIssues,
    getGlobalAnalytics,
    getOrganizationAnalytics
};

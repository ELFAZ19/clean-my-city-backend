/**
 * Issue Service
 * Business logic for issue management and duplicate detection
 */

const { pool } = require('../config/database');
const { ISSUE_STATUS, USER_ROLES } = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');
const duplicateDetectionService = require('./duplicateDetection');

/**
 * Create a new issue (with duplicate detection)
 * @param {Object} issueData - Issue data
 * @param {number} userId - User ID
 * @returns {Object} Created issue result
 */
const createIssue = async (issueData, userId) => {
    const { title, description, organization_id, latitude, longitude, image_buffer, image_mime_type } = issueData;

    try {
        // Check if organization exists and is active
        const [organizations] = await pool.query(
            'SELECT id, is_active FROM organizations WHERE id = ?',
            [organization_id]
        );

        if (organizations.length === 0) {
            throw new AppError('Organization not found', 404);
        }

        if (!organizations[0].is_active) {
            throw new AppError('Organization is not active', 400);
        }

        // 1. Check for duplicates
        const duplicateIssue = await duplicateDetectionService.findDuplicateIssue({
            title,
            description,
            organization_id,
            latitude,
            longitude
        });

        // If an existing duplicate issue is found, return it
        if (duplicateIssue) {
            return {
                isDuplicate: true,
                message: 'A similar issue has already been reported.',
                existingIssue: duplicateIssue
            };
        }

        // 2. Create new issue
        const [result] = await pool.query(
            `INSERT INTO issues (title, description, status, latitude, longitude, image_data, image_mime_type, user_id, organization_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, ISSUE_STATUS.PENDING, latitude || null, longitude || null, image_buffer || null, image_mime_type || null, userId, organization_id]
        );

        const newIssueId = result.insertId;

        // 3. Fetch created issue (excluding heavy blob data for performance)
        const [issues] = await pool.query(
            'SELECT id, title, description, status, latitude, longitude, created_at FROM issues WHERE id = ?',
            [newIssueId]
        );

        return {
            isDuplicate: false,
            message: 'Issue reported successfully',
            issue: issues[0]
        };

    } catch (error) {
        throw error;
    }
};

/**
 * Get user's issues
 * @param {number} userId - User ID
 * @returns {Array} List of issues
 */
const getUserIssues = async (userId) => {
    try {
        const [issues] = await pool.query(
            `SELECT i.id, i.title, i.description, i.status, i.created_at, 
                    o.name as organization_name,
                    CASE WHEN i.image_data IS NOT NULL THEN TRUE ELSE FALSE END as has_image
             FROM issues i
             JOIN organizations o ON i.organization_id = o.id
             WHERE i.user_id = ?
             ORDER BY i.created_at DESC`,
            [userId]
        );

        // Add efficient image URL for issues that have images
        return issues.map(issue => ({
            ...issue,
            image_url: issue.has_image ? `/issue/${issue.id}/image` : null
        }));

    } catch (error) {
        throw error;
    }
};

/**
 * Get organization's issue queue
 * @param {number} organizationId - Organization ID
 * @param {string} status - Optional status filter
 * @returns {Array} List of issues
 */
const getOrganizationIssues = async (organizationId, status = null) => {
    try {
        let query = `
            SELECT i.id, i.title, i.description, i.status, i.created_at, i.latitude, i.longitude,
                   u.full_name as reporter_name, u.phone as reporter_phone,
                   CASE WHEN i.image_data IS NOT NULL THEN TRUE ELSE FALSE END as has_image
            FROM issues i
            JOIN users u ON i.user_id = u.id
            WHERE i.organization_id = ?
        `;
        
        const params = [organizationId];

        if (status) {
            query += ' AND i.status = ?';
            params.push(status);
        }

        query += ' ORDER BY i.created_at DESC';

        const [issues] = await pool.query(query, params);

        // Add efficient image URL for issues that have images
        return issues.map(issue => ({
            ...issue,
            image_url: issue.has_image ? `/issue/${issue.id}/image` : null
        }));

    } catch (error) {
        throw error;
    }
};

/**
 * Update issue status
 * @param {number} issueId - Issue ID
 * @param {string} status - New status
 * @param {number} organizationId - Organization ID
 * @returns {Object} Updated issue
 */
const updateIssueStatus = async (issueId, status, organizationId) => {
    try {
        // Verify issue belongs to organization
        const [issues] = await pool.query(
            'SELECT id, status FROM issues WHERE id = ? AND organization_id = ?',
            [issueId, organizationId]
        );

        if (issues.length === 0) {
            throw new AppError('Issue not found or not assigned to your authority', 404);
        }

        const currentStatus = issues[0].status;

        // Validate status transition (only forward transitions allowed)
        const statusOrder = [ISSUE_STATUS.PENDING, ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.RESOLVED];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const newIndex = statusOrder.indexOf(status);

        if (newIndex < currentIndex) {
            throw new AppError('Cannot move issue backwards in status', 400);
        }

        // Update status
        if (status === ISSUE_STATUS.RESOLVED) {
             await pool.query(
                'UPDATE issues SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, issueId]
            );
        } else {
             await pool.query(
                'UPDATE issues SET status = ? WHERE id = ?',
                [status, issueId]
            );
        }

        return { id: issueId, status };

    } catch (error) {
        throw error;
    }
};

/**
 * Get issue by ID (with full details including image)
 * @param {number} issueId - Issue ID
 * @param {number} userId - Requesting user ID
 * @param {string} role - Requesting user role
 * @returns {Object} Issue details
 */
const getIssueById = async (issueId, userId, role) => {
    try {
        // Base query - excluding large blob for the main JSON response
        let query = `
            SELECT i.id, i.title, i.description, i.status, i.latitude, i.longitude, 
                   i.created_at, i.resolved_at, i.image_mime_type, i.user_id, i.organization_id,
                   CASE WHEN i.image_data IS NOT NULL THEN TRUE ELSE FALSE END as has_image,
                   o.name as organization_name,
                   u.full_name as reporter_name
            FROM issues i
            JOIN organizations o ON i.organization_id = o.id
            JOIN users u ON i.user_id = u.id
            WHERE i.id = ?
        `;

        const [issues] = await pool.query(query, [issueId]);

        if (issues.length === 0) {
            throw new AppError('Issue not found', 404);
        }

        const issue = issues[0];

        // Access control
        if (role === USER_ROLES.CITIZEN && issue.user_id !== userId) {
            throw new AppError('Access denied. You can only view your own issues.', 403);
        }
        
        // For authority (organization), user_id links to organization
        if (role === USER_ROLES.AUTHORITY) {
             const [orgRequest] = await pool.query('SELECT id FROM organizations WHERE user_id = ?', [userId]);
             if (orgRequest.length > 0 && issue.organization_id !== orgRequest[0].id) {
                 throw new AppError('Access denied. Issue not assigned to your authority.', 403);
             }
        }
        
        // Use efficient image URL instead of embedded base64
        issue.image_url = issue.has_image ? `/issue/${issue.id}/image` : null;
        delete issue.image_mime_type;

        return issue;

    } catch (error) {
        throw error;
    }
};

/**
 * Get issue image data directly (efficiently)
 * @param {number} issueId - Issue ID
 * @param {number} userId - Requesting user ID
 * @param {string} role - Requesting user role
 * @returns {Object} Image buffer and mime type
 */
const getIssueImageData = async (issueId, userId, role) => {
    try {
        const [issues] = await pool.query(
            'SELECT image_data, image_mime_type, user_id, organization_id FROM issues WHERE id = ?',
            [issueId]
        );

        if (issues.length === 0) {
            throw new AppError('Issue not found', 404);
        }

        const issue = issues[0];

        if (!issue.image_data) {
            throw new AppError('No image associated with this issue', 404);
        }

        // Access control
        if (role === USER_ROLES.CITIZEN && issue.user_id !== userId) {
            throw new AppError('Access denied.', 403);
        }
        
        if (role === USER_ROLES.AUTHORITY) {
             const [orgRequest] = await pool.query('SELECT id FROM organizations WHERE user_id = ?', [userId]);
             if (orgRequest.length > 0 && issue.organization_id !== orgRequest[0].id) {
                 throw new AppError('Access denied.', 403);
             }
        }

        return {
            buffer: issue.image_data,
            mimeType: issue.image_mime_type
        };

    } catch (error) {
        throw error;
    }
};

module.exports = {
    createIssue,
    getUserIssues,
    getOrganizationIssues,
    updateIssueStatus,
    getIssueById,
    getIssueImageData
};

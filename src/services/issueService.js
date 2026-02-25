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
            'SELECT id, is_active FROM organizations WHERE id = $1',
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
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [title, description, ISSUE_STATUS.PENDING, latitude || null, longitude || null, image_buffer || null, image_mime_type || null, userId, organization_id]
        );

        const newIssueId = result.insertId;

        // 3. Fetch created issue (excluding heavy blob data for performance)
        const [issues] = await pool.query(
            'SELECT id, title, description, status, latitude, longitude, created_at FROM issues WHERE id = $1',
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
            `SELECT i.id, i.title, i.description, i.status, i.created_at, i.latitude, i.longitude,
                    o.name as organization_name,
                    CASE WHEN i.image_data IS NOT NULL THEN TRUE ELSE FALSE END as has_image
             FROM issues i
             JOIN organizations o ON i.organization_id = o.id
             WHERE i.user_id = $1
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
        const params = [organizationId];
        let paramIdx = 2;

        let query = `
            SELECT i.id, i.title, i.description, i.status, i.created_at, i.latitude, i.longitude,
                   u.full_name as reporter_name, u.email as reporter_email, u.phone as reporter_phone,
                   CASE WHEN i.image_data IS NOT NULL THEN TRUE ELSE FALSE END as has_image
            FROM issues i
            JOIN users u ON i.user_id = u.id
            WHERE i.organization_id = $1
        `;

        if (status) {
            query += ` AND i.status = $${paramIdx}`;
            params.push(status);
            paramIdx++;
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
            'SELECT id, status FROM issues WHERE id = $1 AND organization_id = $2',
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
                'UPDATE issues SET status = $1, resolved_at = CURRENT_TIMESTAMP WHERE id = $2',
                [status, issueId]
            );
        } else {
             await pool.query(
                'UPDATE issues SET status = $1 WHERE id = $2',
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
                   u.full_name as reporter_name, u.email as reporter_email, u.phone as reporter_phone
            FROM issues i
            JOIN organizations o ON i.organization_id = o.id
            JOIN users u ON i.user_id = u.id
            WHERE i.id = $1
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
             const [orgRequest] = await pool.query('SELECT id FROM organizations WHERE user_id = $1', [userId]);
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
            'SELECT image_data, image_mime_type, user_id, organization_id FROM issues WHERE id = $1',
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
             const [orgRequest] = await pool.query('SELECT id FROM organizations WHERE user_id = $1', [userId]);
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

const getAllIssues = async () => {
    try {
        const [issues] = await pool.query(`
            SELECT i.id, i.title, i.description, i.status, i.latitude, i.longitude, i.created_at,
                   o.name as organization_name,
                   u.full_name as reporter_name, u.email as reporter_email, u.phone as reporter_phone,
                   CASE WHEN i.image_data IS NOT NULL THEN TRUE ELSE FALSE END as has_image
            FROM issues i
            JOIN organizations o ON i.organization_id = o.id
            JOIN users u ON i.user_id = u.id
            ORDER BY i.created_at DESC
        `);
        return issues;
    } catch (error) { throw error; }
};

/**
 * Build analytics for a given WHERE clause and range
 * Used for both global (admin) and per-organization analytics
 *
 * NOTE: PostgreSQL version — uses numbered $N placeholders.
 * The base params always occupy $1–$4 (or $1–$3 + range).
 * Extra params (e.g. organization_id) are appended after that.
 */
const buildAnalytics = async ({ rangeDays, extraWhereSql = '', extraParams = [] }) => {
    const range = Number.isFinite(rangeDays) && rangeDays > 0 ? rangeDays : 30;

    // ── 1) Timeseries: issues created per day with status breakdown ──
    // Base params: $1=PENDING, $2=IN_PROGRESS, $3=RESOLVED, $4=range
    // Extra params start at $5
    const tsExtra = extraWhereSql
        ? extraWhereSql.replace(/\$X(\d+)/g, (_, n) => `$${4 + Number(n)}`)
        : '';
    const [timeseries] = await pool.query(
        `SELECT
           created_at::date as day,
           COUNT(*) as total,
           SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status = $2 THEN 1 ELSE 0 END) as in_progress,
           SUM(CASE WHEN status = $3 THEN 1 ELSE 0 END) as resolved
         FROM issues
         WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $4
           ${tsExtra}
         GROUP BY created_at::date
         ORDER BY day`,
        [ISSUE_STATUS.PENDING, ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.RESOLVED, range, ...extraParams]
    );

    // ── 2) Resolved by organization category ──
    // Base params: $1=RESOLVED, $2=range
    // Extra params start at $3
    const catExtra = extraWhereSql
        ? extraWhereSql
              .replace(/created_at/g, 'i.resolved_at')
              .replace(/issues /g, 'i ')
              .replace(/\$X(\d+)/g, (_, n) => `$${2 + Number(n)}`)
        : '';
    const [byCategory] = await pool.query(
        `SELECT
           COALESCE(o.category, 'Other') as category,
           COUNT(*) as resolved
         FROM issues i
         JOIN organizations o ON i.organization_id = o.id
         WHERE i.status = $1
           AND i.resolved_at IS NOT NULL
           AND i.resolved_at >= CURRENT_DATE - INTERVAL '1 day' * $2
           ${catExtra}
         GROUP BY COALESCE(o.category, 'Other')
         ORDER BY resolved DESC`,
        [ISSUE_STATUS.RESOLVED, range, ...extraParams]
    );

    // ── 3) SLA buckets based on resolution time in hours ──
    // Base params: $1=RESOLVED, $2=range
    const slaExtra = extraWhereSql
        ? extraWhereSql
              .replace(/created_at/g, 'resolved_at')
              .replace(/\$X(\d+)/g, (_, n) => `$${2 + Number(n)}`)
        : '';
    const [slaRows] = await pool.query(
        `SELECT
           SUM(CASE WHEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 < 4 THEN 1 ELSE 0 END) as lt4,
           SUM(CASE WHEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 BETWEEN 4 AND 11 THEN 1 ELSE 0 END) as h4_12,
           SUM(CASE WHEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 BETWEEN 12 AND 23 THEN 1 ELSE 0 END) as h12_24,
           SUM(CASE WHEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 >= 24 THEN 1 ELSE 0 END) as gt24
         FROM issues
         WHERE status = $1
           AND resolved_at IS NOT NULL
           AND resolved_at >= CURRENT_DATE - INTERVAL '1 day' * $2
           ${slaExtra}`,
        [ISSUE_STATUS.RESOLVED, range, ...extraParams]
    );

    const slaRow = slaRows[0] || { lt4: 0, h4_12: 0, h12_24: 0, gt24: 0 };
    const slaBuckets = [
        { name: '< 4h', value: Number(slaRow.lt4 || 0) },
        { name: '4–12h', value: Number(slaRow.h4_12 || 0) },
        { name: '12–24h', value: Number(slaRow.h12_24 || 0) },
        { name: '> 24h', value: Number(slaRow.gt24 || 0) },
    ];

    // ── 4) Backlog: open issues age vs simple "priority weight" per status ──
    // Base params: $1=PENDING, $2=IN_PROGRESS, $3=RESOLVED
    const blExtra = extraWhereSql
        ? extraWhereSql.replace(/\$X(\d+)/g, (_, n) => `$${3 + Number(n)}`)
        : '';
    const [backlog] = await pool.query(
        `SELECT
           (CURRENT_DATE - created_at::date) as age_days,
           CASE
             WHEN status = $1 THEN 1
             WHEN status = $2 THEN 2
             ELSE 0
           END as weight
         FROM issues
         WHERE status <> $3
           ${blExtra}`,
        [ISSUE_STATUS.PENDING, ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.RESOLVED, ...extraParams]
    );

    const backlogScatter = backlog.map(row => ({
        x: Number(row.age_days || 0),
        y: Number(row.weight || 0),
    }));

    return {
        rangeDays: range,
        timeseries,
        resolutionByCategory: byCategory,
        slaBuckets,
        backlogScatter,
    };
};

const getGlobalAnalytics = async (rangeDays) => {
    return buildAnalytics({ rangeDays });
};

const getOrganizationAnalytics = async (organizationId, rangeDays) => {
    // $X1 is a placeholder that buildAnalytics will renumber per-query
    const extraWhereSql = ' AND organization_id = $X1';
    return buildAnalytics({ rangeDays, extraWhereSql, extraParams: [organizationId] });
};

module.exports = {
    createIssue,
    getUserIssues,
    getOrganizationIssues,
    updateIssueStatus,
    getIssueById,
    getIssueImageData,
    getAllIssues,
    getGlobalAnalytics,
    getOrganizationAnalytics
};

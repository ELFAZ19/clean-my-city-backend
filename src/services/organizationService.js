/**
 * Organization Service
 * Business logic for organization management (Admin only)
 */

const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { USER_ROLES } = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

/**
 * Create a new organization with linked user account
 * @param {Object} orgData - Organization data
 * @returns {Object} Created organization
 */
const createOrganization = async (orgData) => {
    const { name, description, category, contact_email, contact_phone, email, password } = orgData;

    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Check if email already exists
        const [existingUsers] = await connection.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            throw new AppError('Email already registered', 409);
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user account for organization (authority)
        const [userResult] = await connection.query(
            `INSERT INTO users (email, password_hash, full_name, role)
             VALUES (?, ?, ?, ?)`,
            [email, password_hash, name, USER_ROLES.AUTHORITY]
        );

        const userId = userResult.insertId;

        // Create organization
        const [orgResult] = await connection.query(
            `INSERT INTO organizations (user_id, name, description, category, contact_email, contact_phone)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, name, description || null, category, contact_email, contact_phone || null]
        );

        await connection.commit();

        // Fetch created organization
        const [organizations] = await pool.query(
            `SELECT o.*, u.email, u.is_active as user_active
             FROM organizations o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ?`,
            [orgResult.insertId]
        );

        return organizations[0];

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Update organization details
 * @param {number} orgId - Organization ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated organization
 */
const updateOrganization = async (orgId, updateData) => {
    const { name, description, category, contact_email, contact_phone } = updateData;

    try {
        // Check if organization exists
        const [organizations] = await pool.query(
            'SELECT id FROM organizations WHERE id = ?',
            [orgId]
        );

        if (organizations.length === 0) {
            throw new AppError('Organization not found', 404);
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (contact_email !== undefined) {
            updates.push('contact_email = ?');
            values.push(contact_email);
        }
        if (contact_phone !== undefined) {
            updates.push('contact_phone = ?');
            values.push(contact_phone);
        }

        if (updates.length === 0) {
            throw new AppError('No fields to update', 400);
        }

        values.push(orgId);

        await pool.query(
            `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Fetch updated organization
        const [updatedOrgs] = await pool.query(
            `SELECT o.*, u.email, u.is_active as user_active
             FROM organizations o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ?`,
            [orgId]
        );

        return updatedOrgs[0];

    } catch (error) {
        throw error;
    }
};

/**
 * Activate organization
 * @param {number} orgId - Organization ID
 * @returns {Object} Updated organization
 */
const activateOrganization = async (orgId) => {
    try {
        // Get organization and user_id
        const [organizations] = await pool.query(
            'SELECT id, user_id FROM organizations WHERE id = ?',
            [orgId]
        );

        if (organizations.length === 0) {
            throw new AppError('Organization not found', 404);
        }

        const userId = organizations[0].user_id;

        // Activate both organization and user account
        await pool.query('UPDATE organizations SET is_active = TRUE WHERE id = ?', [orgId]);
        await pool.query('UPDATE users SET is_active = TRUE WHERE id = ?', [userId]);

        // Fetch updated organization
        const [updatedOrgs] = await pool.query(
            `SELECT o.*, u.email, u.is_active as user_active
             FROM organizations o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ?`,
            [orgId]
        );

        return updatedOrgs[0];

    } catch (error) {
        throw error;
    }
};

/**
 * Deactivate organization
 * @param {number} orgId - Organization ID
 * @returns {Object} Updated organization
 */
const deactivateOrganization = async (orgId) => {
    try {
        // Get organization and user_id
        const [organizations] = await pool.query(
            'SELECT id, user_id FROM organizations WHERE id = ?',
            [orgId]
        );

        if (organizations.length === 0) {
            throw new AppError('Organization not found', 404);
        }

        const userId = organizations[0].user_id;

        // Deactivate both organization and user account
        await pool.query('UPDATE organizations SET is_active = FALSE WHERE id = ?', [orgId]);
        await pool.query('UPDATE users SET is_active = FALSE WHERE id = ?', [userId]);

        // Fetch updated organization
        const [updatedOrgs] = await pool.query(
            `SELECT o.*, u.email, u.is_active as user_active
             FROM organizations o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ?`,
            [orgId]
        );

        return updatedOrgs[0];

    } catch (error) {
        throw error;
    }
};

/**
 * Get all organizations
 * @param {boolean} activeOnly - Filter for active organizations only
 * @returns {Array} List of organizations
 */
const getAllOrganizations = async (activeOnly = false) => {
    try {
        let query = `
            SELECT o.*, u.email, u.is_active as user_active
            FROM organizations o
            JOIN users u ON o.user_id = u.id
        `;

        if (activeOnly) {
            query += ' WHERE o.is_active = TRUE';
        }

        query += ' ORDER BY o.name ASC';

        const [organizations] = await pool.query(query);

        return organizations;

    } catch (error) {
        throw error;
    }
};

/**
 * Get organization by ID
 * @param {number} orgId - Organization ID
 * @returns {Object} Organization details
 */
const getOrganizationById = async (orgId) => {
    try {
        const [organizations] = await pool.query(
            `SELECT o.*, u.email, u.is_active as user_active
             FROM organizations o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ?`,
            [orgId]
        );

        if (organizations.length === 0) {
            throw new AppError('Organization not found', 404);
        }

        return organizations[0];

    } catch (error) {
        throw error;
    }
};

/**
 * Get public organizations list (for citizens)
 * Returns only active organizations with basic public info
 * @returns {Array} List of active organizations
 */
const getPublicOrganizations = async () => {
    try {
        const [organizations] = await pool.query(
            `SELECT id, name, description, category, contact_email, contact_phone
             FROM organizations
             WHERE is_active = TRUE
             ORDER BY name ASC`
        );

        return organizations;

    } catch (error) {
        throw error;
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

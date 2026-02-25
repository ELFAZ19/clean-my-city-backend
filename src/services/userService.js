/**
 * User Service
 * Business logic for user profile management
 */

const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { SECURITY } = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get user profile by ID
 * @param {number} userId - User ID
 * @returns {Object} User profile
 */
const getUserProfile = async (userId) => {
    try {
        const [users] = await pool.query(
            'SELECT id, email, full_name, phone, role, is_active, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            throw new AppError('User not found', 404);
        }

        return users[0];

    } catch (error) {
        throw error;
    }
};

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated user profile
 */
const updateUserProfile = async (userId, updateData) => {
    const { full_name, phone } = updateData;

    try {
        // Build update query dynamically
        const updates = [];
        const values = [];

        if (full_name !== undefined) {
            updates.push('full_name = ?');
            values.push(full_name);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone);
        }

        if (updates.length === 0) {
            throw new AppError('No fields to update', 400);
        }

        values.push(userId);

        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Fetch updated user
        const [users] = await pool.query(
            'SELECT id, email, full_name, phone, role, is_active, created_at FROM users WHERE id = ?',
            [userId]
        );

        return users[0];

    } catch (error) {
        throw error;
    }
};

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} Success status
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    try {
        // Fetch user with password hash
        const [users] = await pool.query(
            'SELECT id, password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            throw new AppError('User not found', 404);
        }

        const user = users[0];

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            throw new AppError('Current password is incorrect', 401);
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, SECURITY.BCRYPT_ROUNDS);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, userId]
        );

        return true;

    } catch (error) {
        throw error;
    }
};

/**
 * Get all users (Admin only)
 * @returns {Array} List of users
 */
const getAllUsers = async () => {
    const [users] = await pool.query(
        'SELECT id, email, full_name, phone, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return users;
};

/**
 * Toggle user is_active flag (Admin only)
 * @param {number} userId
 * @returns {Object} Updated user
 */
const toggleUserActive = async (userId) => {
    const [rows] = await pool.query('SELECT id, is_active FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) throw new AppError('User not found', 404);
    const newActive = !rows[0].is_active;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newActive, userId]);
    const [updated] = await pool.query(
        'SELECT id, email, full_name, phone, role, is_active, created_at FROM users WHERE id = ?', [userId]
    );
    return updated[0];
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    changePassword,
    getAllUsers,
    toggleUserActive
};

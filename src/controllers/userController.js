/**
 * User Controller
 * Handles user profile management
 */

const userService = require('../services/userService');

/**
 * Get current user profile
 * GET /api/users/profile
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await userService.getUserProfile(req.user.id);

        res.status(200).json({
            success: true,
            data: { user }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const user = await userService.updateUserProfile(req.user.id, req.body);

        // Update session with new data
        if (req.session && req.session.user) {
            req.session.user.full_name = user.full_name;
            req.session.user.phone = user.phone;
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Change password
 * PUT /api/users/password
 */
const changePassword = async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;
        
        await userService.changePassword(req.user.id, current_password, new_password);

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword
};

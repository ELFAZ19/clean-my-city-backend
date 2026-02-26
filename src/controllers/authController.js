/**
 * Authentication Controller
 * Handles user registration, login, and logout
 */

const authService = require('../services/authService');
const { generateToken } = require('../services/authService');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const user = await authService.register(req.body);

        // Generate JWT token for the new user
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, token }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        const result = await authService.login(email, password);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
    try {
        await authService.logout();

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout
};

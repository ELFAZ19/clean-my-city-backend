/**
 * Authentication Middleware
 * Supports both JWT tokens and session-based authentication
 */

const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../config/constants');

/**
 * Authenticate user via JWT token or session
 * Checks Authorization header for JWT or req.session for session-based auth
 */
const authenticate = async (req, res, next) => {
    try {
        let user = null;

        // Method 1: Check for JWT token in Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            
            try {
                const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
                user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    full_name: decoded.full_name
                };
            } catch (jwtError) {
                // JWT invalid or expired, continue to check session
                console.log('JWT verification failed:', jwtError.message);
            }
        }

        // Method 2: Check for session-based authentication
        if (!user && req.session && req.session.user) {
            user = req.session.user;
        }

        // If no authentication method succeeded
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.'
            });
        }

        // Attach user to request object
        req.user = user;
        next();

    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: error.message
        });
    }
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of roles that can access the route
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize
};

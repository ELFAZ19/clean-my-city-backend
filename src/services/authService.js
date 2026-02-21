/**
 * Authentication Service
 * Handles user registration, login, and session management
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { JWT_CONFIG, USER_ROLES } = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} Created user (without password)
 */
const register = async (userData) => {
    const { email, password, full_name, phone, role = USER_ROLES.CITIZEN } = userData;

    try {
        // Check if user already exists
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            throw new AppError('Email already registered', 409);
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const [result] = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, phone, role)
             VALUES (?, ?, ?, ?, ?)`,
            [email, password_hash, full_name, phone || null, role]
        );

        // Fetch created user
        const [users] = await pool.query(
            'SELECT id, email, full_name, phone, role, is_active, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        return users[0];

    } catch (error) {
        throw error;
    }
};

/**
 * Login user and create session
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} session - Express session object
 * @returns {Object} User data and JWT token
 */
const login = async (email, password, session) => {
    try {
        // Find user by email
        const [users] = await pool.query(
            'SELECT id, email, password_hash, full_name, phone, role, is_active FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            throw new AppError('Invalid email or password', 401);
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            throw new AppError('Account is deactivated. Please contact administrator.', 403);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new AppError('Invalid email or password', 401);
        }

        // Create user object (without password)
        const userObject = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role
        };

        // Create session and save to database
        if (session) {
            session.user = userObject;
            session.isLoggedIn = true;
            
            // Explicitly save session to database
            await new Promise((resolve, reject) => {
                session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }

        // Generate JWT token
        const token = jwt.sign(userObject, JWT_CONFIG.SECRET, {
            expiresIn: JWT_CONFIG.EXPIRES_IN
        });

        return {
            user: userObject,
            token
        };

    } catch (error) {
        throw error;
    }
};

/**
 * Logout user by destroying session
 * @param {Object} session - Express session object
 */
const logout = (session) => {
    return new Promise((resolve, reject) => {
        if (session) {
            session.destroy((err) => {
                if (err) {
                    reject(new AppError('Logout failed', 500));
                } else {
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};

/**
 * Verify password strength
 * @param {string} password - Password to verify
 * @returns {boolean} True if password meets requirements
 */
const verifyPasswordStrength = (password) => {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    return (
        password.length >= minLength &&
        hasUppercase &&
        hasLowercase &&
        hasNumber &&
        hasSpecialChar
    );
};

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
    const userObject = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role
    };
    
    return jwt.sign(userObject, JWT_CONFIG.SECRET, {
        expiresIn: JWT_CONFIG.EXPIRES_IN
    });
};

module.exports = {
    register,
    login,
    logout,
    verifyPasswordStrength,
    generateToken
};

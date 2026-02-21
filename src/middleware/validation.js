/**
 * Input Validation Middleware
 * Uses express-validator for comprehensive input validation
 */

const { body, param, validationResult } = require('express-validator');
const { USER_ROLES, ISSUE_STATUS } = require('../config/constants');

/**
 * Validation error handler
 * Extracts and formats validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

/**
 * User Registration Validation
 */
const validateRegistration = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    
    body('full_name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Full name must be between 2 and 255 characters'),
    
    body('phone')
        .optional()
        .matches(/^\+?[\d\s-()]+$/)
        .withMessage('Please provide a valid phone number'),
    
    body('role')
        .optional()
        .isIn(Object.values(USER_ROLES))
        .withMessage('Invalid role specified'),
    
    handleValidationErrors
];

/**
 * Login Validation
 */
const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    handleValidationErrors
];

/**
 * Issue Creation Validation
 */
const validateIssueCreation = [
    body('title')
        .trim()
        .isLength({ min: 5, max: 255 })
        .withMessage('Title must be between 5 and 255 characters'),
    
    body('description')
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('Description must be between 10 and 5000 characters'),
    
    body('organization_id')
        .isInt({ min: 1 })
        .withMessage('Valid organization ID is required'),
    
    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    
    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    
    body('image_url')
        .optional()
        .isURL()
        .withMessage('Please provide a valid image URL'),
    
    handleValidationErrors
];

/**
 * Issue Status Update Validation
 */
const validateStatusUpdate = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid issue ID is required'),
    
    body('status')
        .isIn(Object.values(ISSUE_STATUS))
        .withMessage('Invalid status. Must be PENDING, IN_PROGRESS, or RESOLVED'),
    
    handleValidationErrors
];

/**
 * Organization Creation Validation
 */
const validateOrganizationCreation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Organization name must be between 2 and 255 characters'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('Description must not exceed 5000 characters'),
    
    body('category')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Category must be between 2 and 100 characters'),
    
    body('contact_email')
        .isEmail()
        .withMessage('Please provide a valid contact email')
        .normalizeEmail(),
    
    body('contact_phone')
        .optional()
        .matches(/^\+?[\d\s-()]+$/)
        .withMessage('Please provide a valid phone number'),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email for organization login')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    
    handleValidationErrors
];

/**
 * Profile Update Validation
 */
const validateProfileUpdate = [
    body('full_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Full name must be between 2 and 255 characters'),
    
    body('phone')
        .optional()
        .matches(/^\+?[\d\s-()]+$/)
        .withMessage('Please provide a valid phone number'),
    
    handleValidationErrors
];

/**
 * Password Change Validation
 */
const validatePasswordChange = [
    body('current_password')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('new_password')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    
    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateIssueCreation,
    validateStatusUpdate,
    validateOrganizationCreation,
    validateProfileUpdate,
    validatePasswordChange
};

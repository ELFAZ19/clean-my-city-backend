/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

/**
 * Custom error class for application errors
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message;

    // Log error for debugging (server-side only, never sent to client)
    const logger = require('../config/logger');
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // PostgreSQL unique violation (duplicate entry)
    if (err.code === '23505') {
        message = 'Duplicate entry. This record already exists.';
        statusCode = 409;
    }

    // PostgreSQL foreign key constraint violation
    if (err.code === '23503') {
        message = 'Referenced record does not exist.';
        statusCode = 400;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        message = 'Invalid token. Please login again.';
        statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        message = 'Token expired. Please login again.';
        statusCode = 401;
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        message = 'Validation failed';
        statusCode = 400;
    }

    // CRITICAL: In production, NEVER expose internal error details
    // Only operational (expected) errors get their message passed to client
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred. Please try again later.';
    }

    res.status(statusCode).json({
        success: false,
        message: message
        // No stack traces, no error codes, no internal details
    });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
    // Don't reveal the attempted URL in production
    const message = process.env.NODE_ENV === 'production'
        ? 'The requested resource was not found'
        : `Route not found: ${req.originalUrl}`;
    const error = new AppError(message, 404);
    next(error);
};

module.exports = {
    AppError,
    errorHandler,
    notFound
};

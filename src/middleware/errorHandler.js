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
    let error = { ...err };
    error.message = err.message;

    // Log error for debugging
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method
    });

    // MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
        error.message = 'Duplicate entry. This record already exists.';
        error.statusCode = 409;
    }

    // MySQL foreign key constraint error
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        error.message = 'Referenced record does not exist.';
        error.statusCode = 400;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token. Please login again.';
        error.statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired. Please login again.';
        error.statusCode = 401;
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        error.message = 'Validation failed';
        error.statusCode = 400;
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
    const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
    next(error);
};

module.exports = {
    AppError,
    errorHandler,
    notFound
};

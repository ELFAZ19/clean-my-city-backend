/**
 * System Constants
 * Centralized configuration for roles, statuses, and business rules
 */

// User roles
const USER_ROLES = {
    CITIZEN: 'CITIZEN',
    AUTHORITY: 'AUTHORITY',
    ADMIN: 'ADMIN'
};

// Issue statuses
const ISSUE_STATUS = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED'
};

// Duplicate detection thresholds
const DUPLICATE_DETECTION = {
    TIME_WINDOW_HOURS: parseInt(process.env.DUPLICATE_TIME_WINDOW_HOURS) || 48,
    DISTANCE_METERS: parseInt(process.env.DUPLICATE_DISTANCE_METERS) || 100,
    SIMILARITY_THRESHOLD: parseFloat(process.env.DUPLICATE_SIMILARITY_THRESHOLD) || 0.7
};

// JWT configuration
const JWT_CONFIG = {
    SECRET: process.env.JWT_SECRET, // NO FALLBACK - MUST BE IN ENV
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
};

// Password requirements
const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: true
};

// Rate limiting
const RATE_LIMIT = {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
};

// Security Config
const SECURITY = {
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12, // Increased to 12
    CSRF_COOKIE_NAME: '_csrf',
    TOKEN_COOKIE_NAME: 'cmc_token'
};

module.exports = {
    USER_ROLES,
    ISSUE_STATUS,
    DUPLICATE_DETECTION,
    JWT_CONFIG,
    PASSWORD_REQUIREMENTS,
    RATE_LIMIT,
    SECURITY
};

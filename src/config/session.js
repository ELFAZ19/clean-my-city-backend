/**
 * Session Configuration
 * Express session with PostgreSQL store
 */

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pgPool } = require('./database');
require('dotenv').config();

// Create session store using PostgreSQL
const sessionStore = new pgSession({
    pool: pgPool,
    tableName: 'sessions',
    createTableIfMissing: true
});

console.log('✓ Session store connected to PostgreSQL');

// Session middleware configuration
const isProduction = process.env.NODE_ENV === 'production';
const sessionConfig = {
    key: 'fix_my_city_sid', // Custom cookie name
    secret: process.env.SESSION_SECRET, // NO FALLBACK - MUST BE IN ENV
    store: sessionStore,
    resave: false,
    saveUninitialized: false, // Don't create session until something stored
    rolling: true, // Renew session with activity
    cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 604800000, // 7 days
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        secure: isProduction, // HTTPS only in production
        sameSite: isProduction ? 'strict' : 'lax', // Strict in production
        path: '/'
    }
};

module.exports = sessionConfig;

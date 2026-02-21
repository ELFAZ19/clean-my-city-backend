/**
 * Session Configuration
 * Express session with MySQL store
 */

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

// Session store options with DB connection details
const sessionStoreOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fix_my_city',
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutes
    expiration: parseInt(process.env.SESSION_MAX_AGE) || 604800000, // 7 days
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
};

// Create session store using direct options
// This allows the store to manage its own connection pool independently
const sessionStore = new MySQLStore(sessionStoreOptions);

// Add ready listener for debugging
sessionStore.onReady().then(() => {
    console.log('✓ Session store connected to MySQL (Direct Connection)');
}).catch(error => {
    console.error('✗ Session store connection failed:', error);
});

// Session middleware configuration
const sessionConfig = {
    key: 'fix_my_city_sid', // Custom cookie name
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false, // Don't create session until something stored
    rolling: false, // Only change session/update expiration if expired (User Request)
    cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 604800000, // 7 days
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax', // Allow session cookies in normal browsing
        path: '/'
    }
};

module.exports = sessionConfig;

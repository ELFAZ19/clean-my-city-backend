/**
 * Express Application Setup
 * Main application configuration with middleware and routes
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const xss = require('xss-clean');
const csrf = require('csurf');
require('dotenv').config();

const sessionConfig = require('./config/session');
const { RATE_LIMIT, SECURITY } = require('./config/constants');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./config/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const issueRoutes = require('./routes/issue.routes');
const organizationRoutes = require('./routes/organization.routes');

// Create Express app
const app = express();

// ============================================
// LOGGING MIDDLEWARE
// ============================================
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, { stream: logger.stream }));

logger.info('Express application initialising (Hardened Mode)...');

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// 1. Helmet - Security headers (Gov-Grade Configuration)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Allow self and inline scripts for React
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "*"], // Allow images from self and uploads
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// 2. CORS - Cross-Origin Resource Sharing

// Read allowed origins from .env, split by comma
// Example in .env: CORS_ORIGIN=https://clean-my-city-frontend.onrender.com,http://localhost:5173
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [];

app.use(cors({
    origin: function (origin, callback) {
        // If origin is undefined (like Postman or curl), you can allow it, else check against allowedOrigins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy: This origin (${origin}) is not allowed.`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// 3. Body Parsing & Sanitization (Strict Limits)
app.use(express.json({ limit: '10kb' })); // Protections against Large Payload DOS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 4. Data Protection
app.use(xss()); // Sanitize user input from XSS
app.use(hpp()); // Prevent HTTP Parameter Pollution

// 5. Rate limiting
const limiter = rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.MAX_REQUESTS,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// 6. CSRF Protection
// Note: We use cookie-based CSRF for SPA compatibility
const isProduction = process.env.NODE_ENV === 'production';
const csrfProtection = csrf({ 
    cookie: {
        key: SECURITY.CSRF_COOKIE_NAME,
        httpOnly: true,
        secure: isProduction, // must be true for sameSite: 'none' in HTTPS
        sameSite: isProduction ? 'none' : 'lax'
    } 
});

// Middleware to provide CSRF token to frontend
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// ============================================
// SESSION MIDDLEWARE
// ============================================
app.use(session(sessionConfig));

// Apply CSRF protection to all API routes (except some if necessary)
// We'll apply it globally for now to be strict
app.use('/api/', (req, res, next) => {
    // Skip CSRF for login/register/logout if they are the first entry points (optional, but safer to keep)
    // Actually, usually we skip for GET and non-mutating, which csurf does by default.
    csrfProtection(req, res, next);
});

// ============================================
// STATIC FILE SERVING
// ============================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// API ROUTES
// ============================================

app.get('/issue-image/:id', (req, res, next) => {
    const issueController = require('./controllers/issueController');
    const { authenticate } = require('./middleware/auth');
    authenticate(req, res, () => {
        issueController.getIssueImage(req, res, next);
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/organizations', organizationRoutes);

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFound);

// Custom error handler for CSRF
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            message: 'Form tempered or invalid CSRF token'
        });
    }
    next(err);
});

app.use(errorHandler);

module.exports = app;

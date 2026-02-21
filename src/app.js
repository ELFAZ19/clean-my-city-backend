/**
 * Express Application Setup
 * Main application configuration with middleware and routes
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const sessionConfig = require('./config/session');
const { RATE_LIMIT } = require('./config/constants');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const issueRoutes = require('./routes/issue.routes');
const organizationRoutes = require('./routes/organization.routes');

// Create Express app
const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow serving images cross-origin
}));

// CORS - Cross-Origin Resource Sharing
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.MAX_REQUESTS,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// ============================================
// SESSION MIDDLEWARE
// ============================================
app.use(session(sessionConfig));

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// STATIC FILE SERVING
// ============================================
// Serve uploaded images from /uploads route
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// API ROUTES
// ============================================

// Dedicated image serving (outside /api to avoid path doubling issues)
app.get('/issue-image/:id', (req, res, next) => {
    // We need to inject the controller here or just use it
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

// 404 Not Found
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;

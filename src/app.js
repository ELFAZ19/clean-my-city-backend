/**
 * Express Application Setup
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

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const issueRoutes = require('./routes/issue.routes');
const organizationRoutes = require('./routes/organization.routes');

const app = express();

/* ============================================
   LOGGING
============================================ */
const morganFormat =
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

app.use(morgan(morganFormat, { stream: logger.stream }));

logger.info('Express application initialising (Hardened Mode)...');

/* ============================================
   SECURITY HEADERS
============================================ */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* ============================================
   CORS (FROM ENV ONLY)
============================================ */

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

/* ============================================
   BODY + COOKIES
============================================ */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(xss());
app.use(hpp());

/* ============================================
   RATE LIMIT
============================================ */
const limiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
});
app.use('/api/', limiter);

/* ============================================
   SESSION (MUST COME BEFORE CSRF)
============================================ */
app.use(session(sessionConfig));

/* ============================================
   CSRF CONFIGURATION (CROSS-ORIGIN SAFE)
============================================ */

const isProduction = process.env.NODE_ENV === 'production';

const csrfProtection = csrf({
  cookie: {
    key: SECURITY.CSRF_COOKIE_NAME || 'csrfToken',
    httpOnly: true,
    secure: isProduction,       // true on Render (HTTPS)
    sameSite: isProduction ? 'none' : 'lax'
  },
});

/* ============================================
   CSRF TOKEN ROUTE
============================================ */

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

/* ============================================
   APPLY CSRF ONLY TO MUTATING REQUESTS
============================================ */

app.use('/api/', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  next();
});

/* ============================================
   STATIC
============================================ */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ============================================
   ROUTES
============================================ */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/organizations', organizationRoutes);

/* ============================================
   ERROR HANDLING
============================================ */

app.use(notFound);

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }
  next(err);
});

app.use(errorHandler);

module.exports = app;
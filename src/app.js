/**
 * Express Application Setup
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const xss = require('xss-clean');
require('dotenv').config();

const { RATE_LIMIT } = require('./config/constants');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./config/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const issueRoutes = require('./routes/issue.routes');
const organizationRoutes = require('./routes/organization.routes');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

/* ============================================
   TRUST PROXY (REQUIRED FOR RENDER)
============================================ */
if (isProduction) {
  app.set('trust proxy', 1);
}

/* ============================================
   LOGGING
============================================ */
const morganFormat =
  isProduction ? 'combined' : 'dev';

app.use(morgan(morganFormat, { stream: logger.stream }));

/* ============================================
   SECURITY HEADERS
============================================ */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* ============================================
   CORS
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
   BODY + COOKIE PARSER
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

app.use(errorHandler);

module.exports = app;
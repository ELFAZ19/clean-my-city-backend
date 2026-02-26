/**
 * Session Configuration
 * Express session with PostgreSQL store
 */

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pgPool } = require('./database');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// PostgreSQL session store
const sessionStore = new pgSession({
  pool: pgPool,
  tableName: 'sessions',
  createTableIfMissing: true,
});

console.log('✓ Session store connected to PostgreSQL');

const sessionConfig = {
  name: 'fix_my_city_sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: isProduction, // VERY IMPORTANT for Render (behind proxy)
  cookie: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 604800000,
    httpOnly: true,
    secure: isProduction,      // MUST be true on Render
    sameSite: isProduction ? 'none' : 'lax',  // 🔥 FIXED
    path: '/',
  },
};

module.exports = sessionConfig;
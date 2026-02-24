/**
 * Logger
 * Winston-based structured logger with daily rotating files
 * Outputs: console (dev) + logs/combined-YYYY-MM-DD.log + logs/error-YYYY-MM-DD.log
 */

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors, json, splat } = format;

// ── Pretty console format ──────────────────────────────────────────────────────
const consoleFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    splat(),
    printf(({ level, message, timestamp: ts, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        return `${ts}  ${level}  ${stack || message}${metaStr}`;
    })
);

// ── Structured JSON file format ────────────────────────────────────────────────
const fileFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    splat(),
    json()
);

// ── Daily rotating transports ──────────────────────────────────────────────────
const combinedRotate = new transports.DailyRotateFile({
    filename:     path.join(logsDir, 'combined-%DATE%.log'),
    datePattern:  'YYYY-MM-DD',
    zippedArchive: true,
    maxFiles:     '30d',   // keep 30 days
    maxSize:      '20m',   // rotate at 20 MB even within a single day
    level:        'info',
    format:       fileFormat,
});

const errorRotate = new transports.DailyRotateFile({
    filename:     path.join(logsDir, 'error-%DATE%.log'),
    datePattern:  'YYYY-MM-DD',
    zippedArchive: true,
    maxFiles:     '90d',   // keep errors 90 days
    maxSize:      '10m',
    level:        'error',
    format:       fileFormat,
});

// ── Create logger ──────────────────────────────────────────────────────────────
const logger = createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transports: [
        combinedRotate,
        errorRotate,
        new transports.Console({ format: consoleFormat }),
    ],
    exitOnError: false,
});

// ── Morgan stream adapter ──────────────────────────────────────────────────────
// lets morgan pipe HTTP logs through winston so they are also written to file
logger.stream = {
    write: (message) => logger.http(message.trimEnd()),
};

module.exports = logger;

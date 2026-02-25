/**
 * Database Configuration
 * PostgreSQL connection pool with mysql2-compatible query wrapper
 */

const { Pool, types } = require('pg');
require('dotenv').config();

// Fix for BIGINT (COUNT returns this) - parse as number
types.setTypeParser(20, (val) => parseInt(val, 10));
// Fix for NUMERIC/DECIMAL - parse as number
types.setTypeParser(1700, (val) => parseFloat(val));

// Create PostgreSQL connection pool
const pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fix_my_city',
    max: 10,                // connectionLimit equivalent
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }
});

/**
 * mysql2-compatible query wrapper
 * Returns [rows, fields] so existing `const [rows] = await pool.query(...)` works unchanged.
 * Also attaches `insertId` when a RETURNING clause is present.
 * Automatically converts '?' placeholders to '$1, $2...' for PostgreSQL compatibility.
 */
const query = async (text, params) => {
    // Convert '?' placeholders to '$1, $2...'
    let pgText = text;
    if (params && params.length > 0) {
        let index = 1;
        pgText = text.replace(/\?/g, () => `$${index++}`);
    }

    const result = await pgPool.query(pgText, params);
    // Mimic mysql2 insertId for INSERT ... RETURNING id
    if (result.rows.length > 0 && result.rows[0].id !== undefined && /^INSERT/i.test(text)) {
        result.rows.insertId = result.rows[0].id;
    }
    return [result.rows, result.fields];
};

/**
 * Get a dedicated client for transactions
 * Usage: const client = await pool.getConnection();
 *        await client.query('BEGIN');
 *        ... do work ...
 *        await client.query('COMMIT');  // or ROLLBACK
 *        client.release();
 *
 * Returns an object with a mysql2-compatible shape:
 *   - query(text, params) → [rows, fields]
 *   - beginTransaction()  → BEGIN
 *   - commit()            → COMMIT
 *   - rollback()          → ROLLBACK
 *   - release()           → release connection back to pool
 */
const getConnection = async () => {
    const client = await pgPool.connect();

    const wrappedQuery = async (text, params) => {
        // Convert '?' placeholders to '$1, $2...'
        let pgText = text;
        if (params && params.length > 0) {
            let index = 1;
            pgText = text.replace(/\?/g, () => `$${index++}`);
        }

        const result = await client.query(pgText, params);
        if (result.rows.length > 0 && result.rows[0].id !== undefined && /^INSERT/i.test(text)) {
            result.rows.insertId = result.rows[0].id;
        }
        return [result.rows, result.fields];
    };

    return {
        query: wrappedQuery,
        beginTransaction: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK'),
        release: () => client.release()
    };
};

// Test database connection
const testConnection = async () => {
    try {
        const client = await pgPool.connect();
        console.log('✓ Database connected successfully (PostgreSQL)');
        client.release();
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        return false;
    }
};

module.exports = {
    pool: { query, getConnection },   // Compatible wrapper
    pgPool,                            // Raw pg Pool (for connect-pg-simple)
    testConnection
};

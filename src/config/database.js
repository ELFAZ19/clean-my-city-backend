/**
 * Database Configuration
 * MySQL connection pool with promise support
 */

const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fix_my_city',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Get promise-based connection pool for async/await queries
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('✓ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        return false;
    }
};

module.exports = {
    pool: promisePool,       // Promise pool for async/await queries
    rawPool: pool,           // Raw pool for express-mysql-session
    testConnection
};

/**
 * Server Entry Point
 * Starts the Express server and connects to database
 */

require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

/**
 * Start server
 */
const startServer = async () => {
    try {
        // Test database connection
        console.log('Testing database connection...');
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('Failed to connect to database. Exiting...');
            process.exit(1);
        }

        // Start Express server
        app.listen(PORT, HOST, () => {
            console.log('');
            console.log('='.repeat(50));
            console.log('  Fix My City - Backend API');
            console.log('='.repeat(50));
            console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`  Server running at: http://${HOST}:${PORT}`);
            console.log(`  Health check: http://${HOST}:${PORT}/health`);
            console.log('='.repeat(50));
            console.log('');
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Start the server
startServer();

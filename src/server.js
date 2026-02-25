/**
 * Server Entry Point
 * Starts the Express server and connects to database
 */

require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;

/**
 * Start server
 */
const startServer = async () => {
  try {
    console.log('Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('  Fix My City - Backend API');
      console.log('='.repeat(50));
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Server running on port: ${PORT}`);
      console.log(`  Health check: /health`);
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

startServer();
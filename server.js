/**
 * Server Entry Point
 * 
 */

import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/config/database.js';
import passport from './src/config/passport.js';

const PORT = process.env.PORT || 8000;

/**
 * Start Server
 * 
 * Initialization sequence:
 * 1. Initialize Passport middleware
 * 2. Connect to MongoDB
 * 3. Start Express server
 * 4. Set up graceful shutdown handlers
 */
const startServer = async () => {
  try {
    console.log('🔐 Initializing Passport...');
    app.use(passport.initialize());
    console.log('✅ Passport initialized\n');
    
    // Connect to MongoDB
    await connectDB();
    
    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`Environment: ${process.env.NODE_ENV?.padEnd(23) || 'development'.padEnd(23)} \n Port: ${PORT.toString().padEnd(31)} \n URL: http://localhost:${PORT}${' '.repeat(16)}`);
    });
    
    /**
     * Graceful Shutdown Handler
     * 
     * Handles SIGTERM and SIGINT signals properly:
     * - Stops accepting new requests
     * - Waits for existing requests to complete
     * - Closes database connections
     * - Exits process cleanly
     */
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Closing server gracefully...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          const mongoose = await import('mongoose');
          await mongoose.default.connection.close();
          console.log('MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

/**
 * Global Error Handlers
 * 
 * Last resort for uncaught errors:
 * - Log the error
 * - Exit process (let process manager restart)
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
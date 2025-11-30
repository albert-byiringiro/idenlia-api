/**
 * Server Entry Point
 */

import dotenv from 'dotenv';
dotenv.config();

// Import modules AFTER dotenv has loaded
import app from './src/app.js';
import { connectDB } from './src/config/database.js';
import passport, { configurePassport } from './src/config/passport.js';

const PORT = process.env.PORT || 8000;

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // ========================================
    // Configure Passport Strategies
    // AFTER env vars are loaded
    // ========================================
    configurePassport();
    
    // ========================================
    // Initialize Passport Middleware
    // ========================================
    console.log('🔐 Initializing Passport...');
    app.use(passport.initialize());
    console.log('✅ Passport initialized\n');
    
    // Connect to MongoDB
    await connectDB();
    
    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║                                        ║
║   🚀 Idenlia API Server Running       ║
║                                        ║
║   Environment: ${process.env.NODE_ENV?.padEnd(23) || 'development'.padEnd(23)} ║
║   Port: ${PORT.toString().padEnd(31)} ║
║   URL: http://localhost:${PORT}${' '.repeat(16)} ║
║                                        ║
╚════════════════════════════════════════╝
      `);
    });
    
    /**
     * Graceful Shutdown Handler
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
      
      setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();

/**
 * Global Error Handlers
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
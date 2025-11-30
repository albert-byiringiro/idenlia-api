import dotenv from 'dotenv';

dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/config/database.js';

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`
║   Environment: ${process.env.NODE_ENV?.padEnd(23) || 'development'.padEnd(23)} ║
║   Port: ${PORT.toString().padEnd(31)} ║
║   URL: http://localhost:${PORT}${' '.repeat(16)}
      `);
    });
    
    /**
     * Graceful Shutdown
     * 
     * Handle termination signals properly.
     * Close connections before exiting.
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
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
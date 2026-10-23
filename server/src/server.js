import app from './app.js';
import { config, validateEnv } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

// Catch uncaught exceptions during startup
process.on('uncaughtException', (err) => {
  console.error('[Fatal Error] Uncaught Exception:', err);
  process.exit(1);
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('[Fatal Error] Unhandled Promise Rejection:', reason);
  process.exit(1);
});

/**
 * Bootstrap and start the VeriAlert Server
 */
const startServer = async () => {
  try {
    // 1. Validate required environment variables
    console.log('[Startup] Validating environment configuration...');
    validateEnv();

    // 2. Connect to MongoDB before accepting traffic
    console.log('[Startup] Connecting to MongoDB...');
    await connectDB();

    // 3. Start Express HTTP Server
    const server = app.listen(config.port, () => {
      console.log('====================================================');
      console.log(` SignalTrace — VeriAlert API Server`);
      console.log(` Environment : ${config.nodeEnv}`);
      console.log(` Port        : ${config.port}`);
      console.log(` Health URL  : http://localhost:${config.port}/api/health`);
      console.log(` Client URL  : ${config.clientOrigin}`);
      console.log('====================================================');
    });

    // Graceful Shutdown handler
    const gracefulShutdown = async (signal) => {
      console.log(`\n[Shutdown] Received ${signal}. Closing server gracefully...`);
      server.close(async () => {
        console.log('[Shutdown] HTTP server closed.');
        await disconnectDB();
        console.log('[Shutdown] Process terminated cleanly.');
        process.exit(0);
      });

      // Force exit after 10s timeout
      setTimeout(() => {
        console.error('[Shutdown Error] Forced termination due to timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return server;
  } catch (error) {
    console.error(`[Startup Error] Failed to start server (${error.name || 'UnknownError'}).`);
    process.exit(1);
  }
};

startServer();

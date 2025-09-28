import app from './app';
import { config } from './config';
import { connectDB } from './db';
import logger from './utils/logger';

async function startServer() {
  try {
    // Connect to databases
    await connectDB();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Gaming Proxy Backend started on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Starting graceful shutdown...');

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
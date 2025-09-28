import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { config } from '../config';
import logger from '../utils/logger';

export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export const redis = createClient({
  url: config.redis.url,
});

export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    try {
      await redis.connect();
      logger.info('Connected to Redis');
    } catch (redisError) {
      logger.warn('Redis connection failed (development mode continues)', redisError);
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
  try {
    await redis.disconnect();
  } catch (error) {
    // Redis might not be connected
  }
  logger.info('Disconnected from databases');
}

process.on('beforeExit', disconnectDB);
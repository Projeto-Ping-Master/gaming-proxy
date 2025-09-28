import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '8080'),
  host: process.env.HOST || '0.0.0.0',
  nodeId: process.env.NODE_ID || uuidv4(),
  region: process.env.REGION || 'unknown',

  // Backend API
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  backendApiKey: process.env.BACKEND_API_KEY || '',

  // Redis for coordination
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Tunnel configuration
  maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000'),
  tunnelTimeout: parseInt(process.env.TUNNEL_TIMEOUT || '30000'),
  bufferSize: parseInt(process.env.BUFFER_SIZE || '65536'),

  // Metrics and monitoring
  metricsInterval: parseInt(process.env.METRICS_INTERVAL || '5000'),
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '10000'),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Security
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  maxPacketSize: parseInt(process.env.MAX_PACKET_SIZE || '1500'),

  // Performance
  enableCompression: process.env.ENABLE_COMPRESSION === 'true',
  compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '6'),
};
import fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { config } from './config';
import { logger } from './utils/logger';
import { TunnelManager } from './services/TunnelManager';
import { MetricsCollector } from './services/MetricsCollector';
import { HealthMonitor } from './services/HealthMonitor';

async function buildServer() {
  const server = fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    }
  });

  // Register plugins
  await server.register(websocket);
  await server.register(cors, {
    origin: true,
    credentials: true
  });

  // Initialize services
  const tunnelManager = new TunnelManager();
  const metricsCollector = new MetricsCollector();
  const healthMonitor = new HealthMonitor();

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    const health = await healthMonitor.getHealthStatus();
    const status = health.status === 'healthy' ? 200 : 503;
    return reply.status(status).send(health);
  });

  // Metrics endpoint
  server.get('/metrics', async (request, reply) => {
    const metrics = await metricsCollector.getMetrics();
    return reply.send(metrics);
  });

  // WebSocket for client connections
  server.register(async function (fastify) {
    fastify.get('/tunnel/:sessionId', { websocket: true }, (connection, req) => {
      const sessionId = (req.params as any).sessionId;

      logger.info(`New tunnel connection for session: ${sessionId}`);

      tunnelManager.handleClientConnection(sessionId, connection.socket);

      connection.socket.on('close', () => {
        logger.info(`Tunnel connection closed for session: ${sessionId}`);
        tunnelManager.removeClient(sessionId);
      });
    });
  });

  // UDP tunnel endpoint for game traffic
  server.post('/tunnel/packet', async (request, reply) => {
    try {
      const packet = request.body as any;
      await tunnelManager.forwardPacket(packet);
      return reply.send({ success: true });
    } catch (error) {
      logger.error('Packet forwarding error:', error);
      return reply.status(500).send({ success: false, error: 'Forwarding failed' });
    }
  });

  // Node registration endpoint
  server.post('/register', async (request, reply) => {
    try {
      const nodeInfo = request.body as any;
      await healthMonitor.registerNode(nodeInfo);
      logger.info(`Node registered: ${nodeInfo.id} (${nodeInfo.region})`);
      return reply.send({ success: true });
    } catch (error) {
      logger.error('Node registration error:', error);
      return reply.status(500).send({ success: false, error: 'Registration failed' });
    }
  });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    logger.info('Starting graceful shutdown...');

    try {
      await tunnelManager.shutdown();
      await healthMonitor.shutdown();
      await server.close();
      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown error:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return server;
}

async function start() {
  try {
    const server = await buildServer();

    await server.listen({
      port: config.port,
      host: config.host
    });

    logger.info(`Gaming Proxy Node Server started on ${config.host}:${config.port}`);
    logger.info(`Node ID: ${config.nodeId}`);
    logger.info(`Region: ${config.region}`);
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

start();
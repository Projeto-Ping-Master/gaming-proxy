import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { config } from '../config';
import Redis from 'ioredis';
import axios from 'axios';
import * as cron from 'node-cron';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
      duration?: number;
    };
  };
  uptime: number;
  version: string;
}

interface NodeInfo {
  id: string;
  region: string;
  ip: string;
  port: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastHeartbeat: number;
}

export class HealthMonitor extends EventEmitter {
  private redis: Redis;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private startTime: number;
  private lastHealthStatus: HealthStatus | null = null;

  constructor() {
    super();

    this.redis = new Redis(config.redisUrl);
    this.startTime = Date.now();

    this.redis.on('error', (error) => {
      logger.error('Redis connection error in HealthMonitor:', error);
    });

    this.startHealthChecks();
    this.setupHeartbeat();
    this.setupNodeCleanup();

    logger.info('HealthMonitor initialized');
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Error performing health check:', error);
      }
    }, config.healthCheckInterval);

    // Perform initial health check
    this.performHealthCheck();
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    const checks: HealthStatus['checks'] = {};

    // Check Redis connectivity
    try {
      const redisStart = Date.now();
      await this.redis.ping();
      checks.redis = {
        status: 'pass',
        duration: Date.now() - redisStart
      };
    } catch (error) {
      checks.redis = {
        status: 'fail',
        message: `Redis connectivity failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

    // Check memory usage
    try {
      const memoryUsage = process.memoryUsage();
      const memoryThreshold = 0.8; // 80% threshold
      const usedPercentage = memoryUsage.heapUsed / memoryUsage.heapTotal;

      checks.memory = {
        status: usedPercentage < memoryThreshold ? 'pass' : 'fail',
        message: `Memory usage: ${Math.round(usedPercentage * 100)}%`
      };
    } catch (error) {
      checks.memory = {
        status: 'fail',
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

    // Check CPU usage (simplified)
    try {
      const cpuUsage = process.cpuUsage();
      const cpuThreshold = 0.9; // 90% threshold
      const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

      checks.cpu = {
        status: totalUsage < cpuThreshold ? 'pass' : 'fail',
        message: `CPU usage: ${Math.round(totalUsage * 100) / 100}s`
      };
    } catch (error) {
      checks.cpu = {
        status: 'fail',
        message: `CPU check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

    // Check backend connectivity
    if (config.backendUrl) {
      try {
        const backendStart = Date.now();
        await axios.get(`${config.backendUrl}/health`, {
          timeout: 5000,
          headers: {
            'Authorization': config.backendApiKey ? `Bearer ${config.backendApiKey}` : undefined
          }
        });

        checks.backend = {
          status: 'pass',
          duration: Date.now() - backendStart
        };
      } catch (error) {
        checks.backend = {
          status: 'fail',
          message: `Backend connectivity failed: ${axios.isAxiosError(error) ? error.message : 'Unknown error'}`
        };
      }
    }

    // Determine overall health status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
    let status: HealthStatus['status'];

    if (failedChecks.length === 0) {
      status = 'healthy';
    } else if (failedChecks.length <= 1) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: Date.now(),
      checks,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0'
    };

    this.lastHealthStatus = healthStatus;

    // Store health status in Redis
    try {
      await this.redis.setex(
        `node:health:${config.nodeId}`,
        60, // 1 minute TTL
        JSON.stringify(healthStatus)
      );
    } catch (error) {
      logger.error('Failed to store health status in Redis:', error);
    }

    // Emit health status change
    this.emit('healthStatusChanged', healthStatus);

    // Log health status changes
    if (status !== 'healthy') {
      logger.warn('Health check failed', {
        status,
        failedChecks: failedChecks.length,
        checks: Object.keys(checks).filter(key => checks[key].status === 'fail')
      });
    } else {
      logger.debug('Health check passed', {
        duration: Date.now() - startTime,
        checks: Object.keys(checks).length
      });
    }
  }

  private setupHeartbeat(): void {
    // Send heartbeat every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        logger.error('Error sending heartbeat:', error);
      }
    });
  }

  private async sendHeartbeat(): Promise<void> {
    const nodeInfo: NodeInfo = {
      id: config.nodeId,
      region: config.region,
      ip: '0.0.0.0', // This would be the external IP in production
      port: config.port,
      status: this.lastHealthStatus?.status || 'healthy',
      lastHeartbeat: Date.now()
    };

    try {
      // Store in Redis
      await this.redis.setex(
        `node:heartbeat:${config.nodeId}`,
        120, // 2 minutes TTL
        JSON.stringify(nodeInfo)
      );

      // Also register with backend if available
      if (config.backendUrl) {
        await axios.post(`${config.backendUrl}/api/v1/nodes/heartbeat`, nodeInfo, {
          timeout: 5000,
          headers: {
            'Authorization': config.backendApiKey ? `Bearer ${config.backendApiKey}` : undefined
          }
        });
      }

      logger.debug('Heartbeat sent successfully');
    } catch (error) {
      logger.error('Failed to send heartbeat:', error);
    }
  }

  private setupNodeCleanup(): void {
    // Clean up stale node records every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.cleanupStaleNodes();
      } catch (error) {
        logger.error('Error cleaning up stale nodes:', error);
      }
    });
  }

  private async cleanupStaleNodes(): Promise<void> {
    try {
      const heartbeatKeys = await this.redis.keys('node:heartbeat:*');
      const staleThreshold = Date.now() - (5 * 60 * 1000); // 5 minutes

      for (const key of heartbeatKeys) {
        const data = await this.redis.get(key);
        if (data) {
          const nodeInfo: NodeInfo = JSON.parse(data);
          if (nodeInfo.lastHeartbeat < staleThreshold) {
            // Remove stale node
            await this.redis.del(key);
            await this.redis.del(`node:health:${nodeInfo.id}`);

            logger.info(`Cleaned up stale node: ${nodeInfo.id} (${nodeInfo.region})`);
          }
        }
      }
    } catch (error) {
      logger.error('Error in cleanupStaleNodes:', error);
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    if (!this.lastHealthStatus) {
      // If no health status available, perform check now
      await this.performHealthCheck();
    }

    return this.lastHealthStatus || {
      status: 'unhealthy',
      timestamp: Date.now(),
      checks: {},
      uptime: Date.now() - this.startTime,
      version: '1.0.0'
    };
  }

  async registerNode(nodeInfo: Partial<NodeInfo>): Promise<void> {
    try {
      const fullNodeInfo: NodeInfo = {
        id: nodeInfo.id || config.nodeId,
        region: nodeInfo.region || config.region,
        ip: nodeInfo.ip || '0.0.0.0',
        port: nodeInfo.port || config.port,
        status: 'healthy',
        lastHeartbeat: Date.now()
      };

      await this.redis.setex(
        `node:info:${fullNodeInfo.id}`,
        3600, // 1 hour TTL
        JSON.stringify(fullNodeInfo)
      );

      logger.info(`Node registered: ${fullNodeInfo.id} (${fullNodeInfo.region})`);
    } catch (error) {
      logger.error('Error registering node:', error);
      throw error;
    }
  }

  async getAllNodes(): Promise<NodeInfo[]> {
    try {
      const keys = await this.redis.keys('node:heartbeat:*');
      const nodes: NodeInfo[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          nodes.push(JSON.parse(data));
        }
      }

      return nodes.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);
    } catch (error) {
      logger.error('Error retrieving all nodes:', error);
      return [];
    }
  }

  async getNodesByRegion(region: string): Promise<NodeInfo[]> {
    const allNodes = await this.getAllNodes();
    return allNodes.filter(node => node.region === region);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down HealthMonitor...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Remove this node from registry
    try {
      await this.redis.del(`node:heartbeat:${config.nodeId}`);
      await this.redis.del(`node:health:${config.nodeId}`);
      await this.redis.del(`node:info:${config.nodeId}`);
    } catch (error) {
      logger.error('Error removing node from registry:', error);
    }

    await this.redis.quit();
    logger.info('HealthMonitor shutdown complete');
  }
}
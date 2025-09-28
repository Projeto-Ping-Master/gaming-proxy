import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { config } from '../config';
import Redis from 'ioredis';
import * as os from 'os';

interface NodeMetrics {
  nodeId: string;
  region: string;
  timestamp: number;
  connections: number;
  packetsForwarded: number;
  bytesTransferred: number;
  avgLatency: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLoad: number;
  uptime: number;
}

export class MetricsCollector extends EventEmitter {
  private redis: Redis;
  private metricsInterval: NodeJS.Timeout | null = null;
  private lastNetworkStats: any = null;
  private startTime: number;

  constructor() {
    super();

    this.redis = new Redis(config.redisUrl);
    this.startTime = Date.now();

    this.redis.on('error', (error) => {
      logger.error('Redis connection error in MetricsCollector:', error);
    });

    this.startCollection();
    logger.info('MetricsCollector initialized');
  }

  private startCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectAndStoreMetrics();
      } catch (error) {
        logger.error('Error collecting metrics:', error);
      }
    }, config.metricsInterval);
  }

  private async collectAndStoreMetrics(): Promise<void> {
    try {
      const metrics = await this.collectSystemMetrics();

      // Store metrics in Redis with TTL
      const key = `node:metrics:${config.nodeId}:${Date.now()}`;
      await this.redis.setex(key, 3600, JSON.stringify(metrics)); // 1 hour TTL

      // Update latest metrics
      const latestKey = `node:latest:${config.nodeId}`;
      await this.redis.setex(latestKey, 300, JSON.stringify(metrics)); // 5 minutes TTL

      // Emit metrics event
      this.emit('metricsCollected', metrics);

      logger.debug('Metrics collected and stored', {
        nodeId: config.nodeId,
        connections: metrics.connections,
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage
      });
    } catch (error) {
      logger.error('Error in collectAndStoreMetrics:', error);
    }
  }

  private async collectSystemMetrics(): Promise<NodeMetrics> {
    const now = Date.now();

    // CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);

    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

    // Network load (simplified calculation)
    const networkInterfaces = os.networkInterfaces();
    let networkLoad = 0;

    // Calculate network throughput if we have previous stats
    if (this.lastNetworkStats) {
      const timeDiff = now - this.lastNetworkStats.timestamp;
      // This is a simplified calculation - in production, you'd want more sophisticated network monitoring
      networkLoad = Math.random() * 20; // Mock network load for demo
    }

    this.lastNetworkStats = { timestamp: now };

    // Get tunnel metrics (this would be injected from TunnelManager)
    const tunnelMetrics = this.getTunnelMetrics();

    const metrics: NodeMetrics = {
      nodeId: config.nodeId,
      region: config.region,
      timestamp: now,
      connections: tunnelMetrics.connections,
      packetsForwarded: tunnelMetrics.packetsForwarded,
      bytesTransferred: tunnelMetrics.bytesTransferred,
      avgLatency: tunnelMetrics.avgLatency,
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      networkLoad: Math.round(networkLoad * 100) / 100,
      uptime: now - this.startTime
    };

    return metrics;
  }

  private getTunnelMetrics(): any {
    // This would typically be injected from TunnelManager
    // For now, return mock data
    return {
      connections: Math.floor(Math.random() * 50),
      packetsForwarded: Math.floor(Math.random() * 10000),
      bytesTransferred: Math.floor(Math.random() * 1000000),
      avgLatency: Math.floor(Math.random() * 50) + 20
    };
  }

  async getMetrics(timeRange?: number): Promise<NodeMetrics[]> {
    try {
      const endTime = Date.now();
      const startTime = endTime - (timeRange || 3600000); // Default 1 hour

      const pattern = `node:metrics:${config.nodeId}:*`;
      const keys = await this.redis.keys(pattern);

      // Filter keys by time range
      const filteredKeys = keys.filter(key => {
        const timestamp = parseInt(key.split(':').pop() || '0');
        return timestamp >= startTime && timestamp <= endTime;
      });

      const metricsData = await Promise.all(
        filteredKeys.map(async (key) => {
          const data = await this.redis.get(key);
          return data ? JSON.parse(data) : null;
        })
      );

      return metricsData.filter(data => data !== null).sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error('Error retrieving metrics:', error);
      return [];
    }
  }

  async getLatestMetrics(): Promise<NodeMetrics | null> {
    try {
      const key = `node:latest:${config.nodeId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error retrieving latest metrics:', error);
      return null;
    }
  }

  async getAggregatedMetrics(regions?: string[]): Promise<any> {
    try {
      const pattern = regions && regions.length > 0
        ? `node:latest:*`
        : `node:latest:*`;

      const keys = await this.redis.keys(pattern);
      const allMetrics = await Promise.all(
        keys.map(async (key) => {
          const data = await this.redis.get(key);
          return data ? JSON.parse(data) : null;
        })
      );

      const validMetrics = allMetrics.filter(m => m !== null);

      if (regions && regions.length > 0) {
        const filteredMetrics = validMetrics.filter(m => regions.includes(m.region));
        return this.aggregateMetrics(filteredMetrics);
      }

      return this.aggregateMetrics(validMetrics);
    } catch (error) {
      logger.error('Error retrieving aggregated metrics:', error);
      return null;
    }
  }

  private aggregateMetrics(metrics: NodeMetrics[]): any {
    if (metrics.length === 0) {
      return {
        totalNodes: 0,
        totalConnections: 0,
        totalPacketsForwarded: 0,
        totalBytesTransferred: 0,
        avgLatency: 0,
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        avgNetworkLoad: 0,
        regions: []
      };
    }

    const totalConnections = metrics.reduce((sum, m) => sum + m.connections, 0);
    const totalPacketsForwarded = metrics.reduce((sum, m) => sum + m.packetsForwarded, 0);
    const totalBytesTransferred = metrics.reduce((sum, m) => sum + m.bytesTransferred, 0);
    const avgLatency = metrics.reduce((sum, m) => sum + m.avgLatency, 0) / metrics.length;
    const avgCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    const avgNetworkLoad = metrics.reduce((sum, m) => sum + m.networkLoad, 0) / metrics.length;

    const regions = [...new Set(metrics.map(m => m.region))];

    return {
      totalNodes: metrics.length,
      totalConnections,
      totalPacketsForwarded,
      totalBytesTransferred,
      avgLatency: Math.round(avgLatency * 100) / 100,
      avgCpuUsage: Math.round(avgCpuUsage * 100) / 100,
      avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
      avgNetworkLoad: Math.round(avgNetworkLoad * 100) / 100,
      regions,
      lastUpdated: Math.max(...metrics.map(m => m.timestamp))
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MetricsCollector...');

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    await this.redis.quit();
    logger.info('MetricsCollector shutdown complete');
  }
}
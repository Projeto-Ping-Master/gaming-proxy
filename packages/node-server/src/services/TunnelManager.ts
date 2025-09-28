import { WebSocket } from 'ws';
import { createSocket, Socket } from 'dgram';
import { createConnection, Socket as TCPSocket } from 'net';
import { logger } from '../utils/logger';
import { config } from '../config';
import { EventEmitter } from 'events';

interface TunnelConnection {
  sessionId: string;
  clientSocket: WebSocket;
  targetConnections: Map<string, TCPSocket | Socket>;
  lastActivity: number;
  metrics: {
    packetsForwarded: number;
    bytesTransferred: number;
    latency: number[];
  };
}

interface PacketData {
  sessionId: string;
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
  protocol: 'tcp' | 'udp';
  data: Buffer;
  timestamp: number;
}

export class TunnelManager extends EventEmitter {
  private connections: Map<string, TunnelConnection> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();

    // Cleanup inactive connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 30000); // Every 30 seconds

    logger.info('TunnelManager initialized');
  }

  handleClientConnection(sessionId: string, clientSocket: WebSocket): void {
    logger.info(`Handling new client connection for session: ${sessionId}`);

    const connection: TunnelConnection = {
      sessionId,
      clientSocket,
      targetConnections: new Map(),
      lastActivity: Date.now(),
      metrics: {
        packetsForwarded: 0,
        bytesTransferred: 0,
        latency: []
      }
    };

    this.connections.set(sessionId, connection);

    // Handle incoming packets from client
    clientSocket.on('message', (data) => {
      try {
        const packet: PacketData = JSON.parse(data.toString());
        this.forwardToTarget(connection, packet);
      } catch (error) {
        logger.error(`Error parsing client message for session ${sessionId}:`, error);
      }
    });

    clientSocket.on('close', () => {
      logger.info(`Client disconnected for session: ${sessionId}`);
      this.removeClient(sessionId);
    });

    clientSocket.on('error', (error) => {
      logger.error(`Client socket error for session ${sessionId}:`, error);
      this.removeClient(sessionId);
    });

    // Send connection confirmation
    this.sendToClient(connection, {
      type: 'connection_established',
      sessionId,
      nodeId: config.nodeId,
      timestamp: Date.now()
    });
  }

  async forwardPacket(packet: PacketData): Promise<void> {
    const connection = this.connections.get(packet.sessionId);
    if (!connection) {
      throw new Error(`No connection found for session: ${packet.sessionId}`);
    }

    await this.forwardToTarget(connection, packet);
  }

  private async forwardToTarget(connection: TunnelConnection, packet: PacketData): Promise<void> {
    try {
      connection.lastActivity = Date.now();

      const connectionKey = `${packet.destIp}:${packet.destPort}:${packet.protocol}`;
      let targetConnection = connection.targetConnections.get(connectionKey);

      if (!targetConnection) {
        targetConnection = await this.createTargetConnection(
          connection,
          packet.destIp,
          packet.destPort,
          packet.protocol,
          connectionKey
        );
      }

      // Forward packet data
      if (packet.protocol === 'tcp' && targetConnection instanceof TCPSocket) {
        targetConnection.write(packet.data);
      } else if (packet.protocol === 'udp' && targetConnection instanceof Socket) {
        targetConnection.send(packet.data, packet.destPort, packet.destIp);
      }

      // Update metrics
      connection.metrics.packetsForwarded++;
      connection.metrics.bytesTransferred += packet.data.length;

      // Calculate latency
      const latency = Date.now() - packet.timestamp;
      connection.metrics.latency.push(latency);
      if (connection.metrics.latency.length > 100) {
        connection.metrics.latency.shift(); // Keep only last 100 measurements
      }

      logger.debug(`Packet forwarded: ${packet.sourceIp}:${packet.sourcePort} -> ${packet.destIp}:${packet.destPort} (${packet.protocol})`);
    } catch (error) {
      logger.error(`Error forwarding packet for session ${packet.sessionId}:`, error);
      throw error;
    }
  }

  private async createTargetConnection(
    connection: TunnelConnection,
    destIp: string,
    destPort: number,
    protocol: 'tcp' | 'udp',
    connectionKey: string
  ): Promise<TCPSocket | Socket> {
    return new Promise((resolve, reject) => {
      if (protocol === 'tcp') {
        const tcpSocket = createConnection({
          host: destIp,
          port: destPort,
          timeout: config.tunnelTimeout
        });

        tcpSocket.on('connect', () => {
          logger.debug(`TCP connection established to ${destIp}:${destPort}`);
          connection.targetConnections.set(connectionKey, tcpSocket);
          resolve(tcpSocket);
        });

        tcpSocket.on('data', (data) => {
          // Send response back to client
          this.sendToClient(connection, {
            type: 'packet_response',
            sourceIp: destIp,
            sourcePort: destPort,
            protocol: 'tcp',
            data: data.toString('base64'),
            timestamp: Date.now()
          });
        });

        tcpSocket.on('error', (error) => {
          logger.error(`TCP connection error to ${destIp}:${destPort}:`, error);
          connection.targetConnections.delete(connectionKey);
          reject(error);
        });

        tcpSocket.on('close', () => {
          logger.debug(`TCP connection closed to ${destIp}:${destPort}`);
          connection.targetConnections.delete(connectionKey);
        });

      } else if (protocol === 'udp') {
        const udpSocket = createSocket('udp4');

        udpSocket.on('listening', () => {
          logger.debug(`UDP socket created for ${destIp}:${destPort}`);
          connection.targetConnections.set(connectionKey, udpSocket);
          resolve(udpSocket);
        });

        udpSocket.on('message', (data, rinfo) => {
          // Send response back to client
          this.sendToClient(connection, {
            type: 'packet_response',
            sourceIp: rinfo.address,
            sourcePort: rinfo.port,
            protocol: 'udp',
            data: data.toString('base64'),
            timestamp: Date.now()
          });
        });

        udpSocket.on('error', (error) => {
          logger.error(`UDP socket error for ${destIp}:${destPort}:`, error);
          connection.targetConnections.delete(connectionKey);
          reject(error);
        });

        udpSocket.bind(); // Bind to random port
      }
    });
  }

  private sendToClient(connection: TunnelConnection, message: any): void {
    try {
      if (connection.clientSocket.readyState === WebSocket.OPEN) {
        connection.clientSocket.send(JSON.stringify(message));
      }
    } catch (error) {
      logger.error(`Error sending message to client:`, error);
    }
  }

  removeClient(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      return;
    }

    // Close all target connections
    for (const [key, targetConnection] of connection.targetConnections) {
      try {
        if (targetConnection instanceof TCPSocket) {
          targetConnection.destroy();
        } else if (targetConnection instanceof Socket) {
          targetConnection.close();
        }
      } catch (error) {
        logger.error(`Error closing target connection ${key}:`, error);
      }
    }

    // Close client connection
    try {
      if (connection.clientSocket.readyState === WebSocket.OPEN) {
        connection.clientSocket.close();
      }
    } catch (error) {
      logger.error(`Error closing client socket:`, error);
    }

    this.connections.delete(sessionId);
    logger.info(`Removed client connection for session: ${sessionId}`);

    this.emit('clientDisconnected', sessionId);
  }

  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const timeout = config.tunnelTimeout;

    for (const [sessionId, connection] of this.connections) {
      if (now - connection.lastActivity > timeout) {
        logger.info(`Cleaning up inactive connection for session: ${sessionId}`);
        this.removeClient(sessionId);
      }
    }
  }

  getConnectionMetrics(sessionId?: string): any {
    if (sessionId) {
      const connection = this.connections.get(sessionId);
      if (!connection) {
        return null;
      }

      const avgLatency = connection.metrics.latency.length > 0
        ? connection.metrics.latency.reduce((a, b) => a + b, 0) / connection.metrics.latency.length
        : 0;

      return {
        sessionId,
        packetsForwarded: connection.metrics.packetsForwarded,
        bytesTransferred: connection.metrics.bytesTransferred,
        avgLatency: Math.round(avgLatency * 100) / 100,
        activeConnections: connection.targetConnections.size,
        lastActivity: connection.lastActivity
      };
    }

    // Return summary for all connections
    const totalPackets = Array.from(this.connections.values())
      .reduce((sum, conn) => sum + conn.metrics.packetsForwarded, 0);

    const totalBytes = Array.from(this.connections.values())
      .reduce((sum, conn) => sum + conn.metrics.bytesTransferred, 0);

    const allLatencies = Array.from(this.connections.values())
      .flatMap(conn => conn.metrics.latency);

    const avgLatency = allLatencies.length > 0
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      : 0;

    return {
      totalConnections: this.connections.size,
      totalPackets,
      totalBytes,
      avgLatency: Math.round(avgLatency * 100) / 100,
      activeConnections: Array.from(this.connections.values())
        .reduce((sum, conn) => sum + conn.targetConnections.size, 0)
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down TunnelManager...');

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    const sessionIds = Array.from(this.connections.keys());
    for (const sessionId of sessionIds) {
      this.removeClient(sessionId);
    }

    logger.info('TunnelManager shutdown complete');
  }
}
import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import type { Server, ApiResponse } from '@gaming-proxy/shared';

const router = Router();

// GET /api/v1/servers
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const servers = await prisma.server.findMany({
      where: { status: 'online' },
      select: {
        id: true,
        region: true,
        ip: true,
        capacity: true,
        weight: true,
        status: true
      }
    });

    // Calculate ping estimates and load (mock for now)
    const serversWithMetrics = servers.map(server => ({
      ...server,
      pingEstimate: Math.floor(Math.random() * 100) + 20, // Mock ping 20-120ms
      load: Math.floor(Math.random() * 80) + 10 // Mock load 10-90%
    }));

    const response: ApiResponse<Server[]> = {
      success: true,
      data: serversWithMetrics
    };

    res.json(response);
  } catch (error) {
    logger.error('Get servers error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/v1/servers/recommended
router.get('/recommended', authenticate, async (req: AuthRequest, res) => {
  try {
    // For now, just return the server with lowest mock ping
    const servers = await prisma.server.findMany({
      where: { status: 'online' },
      select: {
        id: true,
        region: true,
        ip: true,
        capacity: true,
        weight: true,
        status: true
      }
    });

    if (servers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No servers available'
      });
    }

    // Mock recommendation logic - in real implementation, this would use
    // geolocation, current load, and actual ping measurements
    const recommendedServer = servers[Math.floor(Math.random() * servers.length)];

    const response: ApiResponse<Server> = {
      success: true,
      data: {
        ...recommendedServer,
        pingEstimate: Math.floor(Math.random() * 50) + 15,
        load: Math.floor(Math.random() * 60) + 10
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Get recommended server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import type {
  StartSessionRequest,
  StartSessionResponse,
  SessionMetrics,
  ApiResponse
} from '@gaming-proxy/shared';

const router = Router();

const startSessionSchema = Joi.object({
  gameId: Joi.string().required(),
  serverId: Joi.string().optional(),
  mode: Joi.string().valid('auto', 'manual').required()
});

// POST /api/v1/session/start
router.post('/start', authenticate, async (req: AuthRequest, res) => {
  try {
    const { error, value } = startSessionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { gameId, serverId, mode } = value as StartSessionRequest;

    // Check if user has an active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.id,
        status: 'active',
        expiresAt: { gt: new Date() }
      }
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: 'Active subscription required'
      });
    }

    // Check if game exists
    const game = await prisma.game.findUnique({
      where: { gameId }
    });

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    // End any existing active sessions for this user
    await prisma.session.updateMany({
      where: {
        userId: req.user!.id,
        status: 'active'
      },
      data: {
        status: 'ended',
        endAt: new Date()
      }
    });

    // Select server
    let selectedServer;
    if (mode === 'manual' && serverId) {
      selectedServer = await prisma.server.findFirst({
        where: {
          id: serverId,
          status: 'online'
        }
      });

      if (!selectedServer) {
        return res.status(404).json({
          success: false,
          error: 'Server not available'
        });
      }
    } else {
      // Auto mode - select best server
      selectedServer = await prisma.server.findFirst({
        where: { status: 'online' },
        orderBy: { weight: 'desc' }
      });

      if (!selectedServer) {
        return res.status(503).json({
          success: false,
          error: 'No servers available'
        });
      }
    }

    // Create session
    const nodeId = uuidv4(); // Mock node ID
    const session = await prisma.session.create({
      data: {
        userId: req.user!.id,
        serverId: selectedServer.id,
        nodeId,
        gameId: game.gameId,
        status: 'active'
      }
    });

    logger.info(`Session started: ${session.id} for user ${req.user!.email}`);

    const response: ApiResponse<StartSessionResponse> = {
      success: true,
      data: {
        sessionId: session.id,
        assignedNode: {
          id: selectedServer.id,
          region: selectedServer.region,
          ip: selectedServer.ip,
          capacity: selectedServer.capacity,
          weight: selectedServer.weight,
          status: selectedServer.status as any
        }
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Start session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/v1/session/stop
router.post('/stop', authenticate, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }

    // Find and end session
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: req.user!.id,
        status: 'active'
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Active session not found'
      });
    }

    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: 'ended',
        endAt: new Date()
      }
    });

    logger.info(`Session ended: ${session.id} for user ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    logger.error('Stop session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/v1/session/active
router.get('/active', authenticate, async (req: AuthRequest, res) => {
  try {
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: req.user!.id,
        status: 'active'
      },
      include: {
        server: true,
        game: true
      }
    });

    if (!activeSession) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: activeSession.id,
        game: activeSession.game,
        server: activeSession.server,
        startAt: activeSession.startAt,
        nodeId: activeSession.nodeId
      }
    });
  } catch (error) {
    logger.error('Get active session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/v1/metrics/session/:id
router.get('/metrics/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Parse metrics from JSON or generate mock data
    let metrics = [];
    if (session.metricsJson) {
      try {
        metrics = JSON.parse(session.metricsJson);
      } catch {
        // Invalid JSON, generate mock data
      }
    }

    // If no metrics, generate mock data for demonstration
    if (metrics.length === 0) {
      const startTime = session.startAt.getTime();
      const now = Date.now();
      const duration = Math.min(now - startTime, 30 * 60 * 1000); // Max 30 minutes

      for (let i = 0; i < Math.floor(duration / 5000); i++) {
        metrics.push({
          ping: Math.floor(Math.random() * 30) + 25,
          jitter: Math.floor(Math.random() * 10) + 1,
          packetLoss: Math.random() * 2,
          timestamp: new Date(startTime + i * 5000)
        });
      }
    }

    const avgPing = metrics.length > 0
      ? metrics.reduce((sum: number, m: any) => sum + m.ping, 0) / metrics.length
      : 0;

    const avgJitter = metrics.length > 0
      ? metrics.reduce((sum: number, m: any) => sum + m.jitter, 0) / metrics.length
      : 0;

    const totalPacketLoss = metrics.length > 0
      ? metrics.reduce((sum: number, m: any) => sum + m.packetLoss, 0) / metrics.length
      : 0;

    const response: ApiResponse<SessionMetrics> = {
      success: true,
      data: {
        sessionId: session.id,
        metrics,
        avgPing: Math.round(avgPing * 100) / 100,
        avgJitter: Math.round(avgJitter * 100) / 100,
        totalPacketLoss: Math.round(totalPacketLoss * 100) / 100
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Get session metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
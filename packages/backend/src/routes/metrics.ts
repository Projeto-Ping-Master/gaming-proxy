import { Router } from 'express';
import { prisma, redis } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import type { ApiResponse, AdminStats, UserSession } from '@gaming-proxy/shared';

const router = Router();

// GET /api/v1/metrics/dashboard - User dashboard metrics
router.get('/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user's total sessions
    const totalSessions = await prisma.session.count({
      where: { userId }
    });

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: {
        userId,
        status: 'active'
      },
      include: {
        game: true,
        server: true
      }
    });

    // Calculate total usage time
    const sessions = await prisma.session.findMany({
      where: { userId },
      select: {
        startAt: true,
        endAt: true
      }
    });

    const totalUsageMs = sessions.reduce((total, session) => {
      const start = session.startAt.getTime();
      const end = session.endAt ? session.endAt.getTime() : Date.now();
      return total + (end - start);
    }, 0);

    const totalUsageHours = Math.round((totalUsageMs / (1000 * 60 * 60)) * 100) / 100;

    // Mock improvement metrics (in production, calculate from real metrics)
    const avgPingImprovement = -28; // -28ms improvement
    const stabilityImprovement = 85; // 85% improvement

    const response: ApiResponse = {
      success: true,
      data: {
        totalSessions,
        activeSession,
        totalUsageHours,
        avgPingImprovement,
        stabilityImprovement,
        currentPing: activeSession ? Math.floor(Math.random() * 30) + 25 : null,
        currentJitter: activeSession ? Math.floor(Math.random() * 10) + 1 : null,
        currentPacketLoss: activeSession ? Math.random() * 2 : null
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/v1/metrics/session-history - User session history
router.get('/session-history', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const sessions = await prisma.session.findMany({
      where: { userId },
      include: {
        game: true,
        server: true
      },
      orderBy: { startAt: 'desc' },
      take: limit,
      skip: offset
    });

    const sessionsWithMetrics = sessions.map(session => {
      // Parse metrics or generate mock data
      let metrics = {};
      if (session.metricsJson) {
        try {
          metrics = JSON.parse(session.metricsJson);
        } catch {
          // Invalid JSON, use defaults
        }
      }

      const duration = session.endAt
        ? session.endAt.getTime() - session.startAt.getTime()
        : Date.now() - session.startAt.getTime();

      return {
        ...session,
        duration: Math.round(duration / 1000), // in seconds
        avgPing: (metrics as any).avgPing || Math.floor(Math.random() * 50) + 25,
        avgJitter: (metrics as any).avgJitter || Math.floor(Math.random() * 10) + 1,
        packetLoss: (metrics as any).packetLoss || Math.random() * 2,
        improvement: Math.floor(Math.random() * 40) + 10 // Mock improvement
      };
    });

    const response: ApiResponse = {
      success: true,
      data: sessionsWithMetrics
    };

    res.json(response);
  } catch (error) {
    logger.error('Session history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/v1/metrics/realtime/:sessionId - Real-time session metrics
router.get('/realtime/:sessionId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get real-time metrics from Redis cache
    const metricsKey = `session:realtime:${sessionId}`;
    const cachedMetrics = await redis.get(metricsKey);

    let realtimeMetrics;
    if (cachedMetrics) {
      realtimeMetrics = JSON.parse(cachedMetrics);
    } else {
      // Generate mock real-time data
      const now = Date.now();
      const points = [];

      for (let i = 0; i < 20; i++) {
        points.push({
          timestamp: now - (20 - i) * 5000, // 5 second intervals
          ping: Math.floor(Math.random() * 30) + 25,
          jitter: Math.floor(Math.random() * 10) + 1,
          packetLoss: Math.random() * 2,
          bandwidth: Math.floor(Math.random() * 50) + 100 // Mbps
        });
      }

      realtimeMetrics = {
        sessionId,
        dataPoints: points,
        currentPing: points[points.length - 1].ping,
        currentJitter: points[points.length - 1].jitter,
        currentPacketLoss: points[points.length - 1].packetLoss,
        lastUpdated: now
      };

      // Cache for 30 seconds
      await redis.setex(metricsKey, 30, JSON.stringify(realtimeMetrics));
    }

    const response: ApiResponse = {
      success: true,
      data: realtimeMetrics
    };

    res.json(response);
  } catch (error) {
    logger.error('Real-time metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/v1/metrics/admin/stats - Admin statistics (protected)
router.get('/admin/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    // Simple admin check (in production, use proper role-based auth)
    if (!req.user!.email.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const totalUsers = await prisma.user.count();

    const activeUsers = await prisma.user.count({
      where: {
        sessions: {
          some: {
            status: 'active'
          }
        }
      }
    });

    const totalSessions = await prisma.session.count();

    const activeSessions = await prisma.session.count({
      where: { status: 'active' }
    });

    // Get node status from Redis
    const nodeKeys = await redis.keys('node:heartbeat:*');
    const nodeStatus = [];

    for (const key of nodeKeys) {
      try {
        const nodeData = await redis.get(key);
        if (nodeData) {
          const node = JSON.parse(nodeData);
          nodeStatus.push({
            id: node.id,
            region: node.region,
            ip: node.ip,
            load: Math.floor(Math.random() * 80) + 10, // Mock load
            connections: Math.floor(Math.random() * 50),
            status: node.status,
            lastHeartbeat: node.lastHeartbeat
          });
        }
      } catch (error) {
        logger.error('Error parsing node data:', error);
      }
    }

    const stats: AdminStats = {
      totalUsers,
      activeUsers,
      totalSessions,
      activeSessions,
      nodeStatus,
      systemLoad: Math.floor(Math.random() * 50) + 30 // Mock system load
    };

    const response: ApiResponse<AdminStats> = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/v1/metrics/admin/sessions - Active user sessions (admin)
router.get('/admin/sessions', authenticate, async (req: AuthRequest, res) => {
  try {
    // Simple admin check
    if (!req.user!.email.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const activeSessions = await prisma.session.findMany({
      where: { status: 'active' },
      include: {
        user: {
          select: { email: true }
        },
        game: true,
        server: true
      },
      orderBy: { startAt: 'desc' }
    });

    const userSessions: UserSession[] = activeSessions.map(session => {
      const duration = Date.now() - session.startAt.getTime();

      return {
        sessionId: session.id,
        userId: session.userId,
        userEmail: session.user.email,
        gameId: session.gameId,
        nodeId: session.nodeId,
        startTime: session.startAt,
        duration: Math.round(duration / 1000),
        avgPing: Math.floor(Math.random() * 50) + 25, // Mock data
        status: 'active'
      };
    });

    const response: ApiResponse<UserSession[]> = {
      success: true,
      data: userSessions
    };

    res.json(response);
  } catch (error) {
    logger.error('Admin sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/v1/metrics/report - Submit metrics report
router.post('/report', authenticate, async (req: AuthRequest, res) => {
  try {
    const { sessionId, metrics } = req.body;

    if (!sessionId || !metrics) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and metrics are required'
      });
    }

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: req.user!.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Update session with metrics
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        metricsJson: JSON.stringify(metrics)
      }
    });

    // Cache real-time metrics in Redis
    const realtimeKey = `session:realtime:${sessionId}`;
    await redis.setex(realtimeKey, 300, JSON.stringify({ // 5 minutes TTL
      sessionId,
      ...metrics,
      lastUpdated: Date.now()
    }));

    logger.info(`Metrics reported for session: ${sessionId}`);

    res.json({
      success: true,
      message: 'Metrics reported successfully'
    });
  } catch (error) {
    logger.error('Report metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
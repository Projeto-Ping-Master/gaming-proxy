import { Router } from 'express';
import { prisma } from '../db';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import type { Game, ApiResponse } from '@gaming-proxy/shared';

const router = Router();

// GET /api/v1/games
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' }
    });

    const response: ApiResponse<Game[]> = {
      success: true,
      data: games
    };

    res.json(response);
  } catch (error) {
    logger.error('Get games error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/v1/games/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const game = await prisma.game.findUnique({
      where: { gameId: id }
    });

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const response: ApiResponse<Game> = {
      success: true,
      data: game
    };

    res.json(response);
  } catch (error) {
    logger.error('Get game error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
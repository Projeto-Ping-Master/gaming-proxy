import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, verified: true }
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      if (!user.verified) {
        return res.status(401).json({ success: false, error: 'Email not verified' });
      }

      req.user = { id: user.id, email: user.email };
      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token:', jwtError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, verified: true }
    });

    if (user && user.verified) {
      req.user = { id: user.id, email: user.email };
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
};
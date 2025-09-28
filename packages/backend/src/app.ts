import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth';
import serverRoutes from './routes/servers';
import sessionRoutes from './routes/sessions';
import gameRoutes from './routes/games';
import billingRoutes from './routes/billing';
import metricsRoutes from './routes/metrics';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [config.app.clientUrl, 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: { success: false, error: 'Too many requests' }
});
app.use('/api/', limiter);

// Body parsing
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' })); // Stripe webhook needs raw body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/servers', serverRoutes);
app.use('/api/v1/session', sessionRoutes);
app.use('/api/v1/games', gameRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/metrics', metricsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error'
  });
});

export default app;
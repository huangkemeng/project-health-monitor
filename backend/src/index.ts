import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { getDbHealth } from './lib/db';
import { autoMigrate } from './lib/db/auto-migrate';

// Import routes
import authRoutes from './routes/auth';
import webhookRoutes from './routes/webhooks';
import monitorRoutes from './routes/monitors';
import dashboardRoutes from './routes/dashboard';
import historyRoutes from './routes/history';
import cronRoutes from './routes/cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Limit each IP to 120 requests per minute
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login attempts per 15 minutes
  message: {
    success: false,
    message: '登录尝试次数过多，请15分钟后再试',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  const dbHealth = getDbHealth();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbHealth
  });
});

// Detailed health check endpoint
app.get('/health/detailed', (req, res) => {
  const dbHealth = getDbHealth();
  const overallHealth = dbHealth.healthy ? 'healthy' : 'unhealthy';

  res.status(dbHealth.healthy ? 200 : 503).json({
    status: overallHealth,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: dbHealth,
      api: { status: 'up' }
    },
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/cron', cronRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Run database auto-migration on startup
  console.log('[Server] Running database migrations...');
  await autoMigrate();
});

export default app;

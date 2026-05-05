import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { getDbHealth } from './lib/db';
import { autoMigrate } from './lib/db/auto-migrate';
import { startScheduler, stopScheduler } from './lib/scheduler';

// Import routes
import authRoutes from './routes/auth';
import webhookRoutes from './routes/webhooks';
import monitorRoutes from './routes/monitors';
import groupRoutes from './routes/groups';
import dashboardRoutes from './routes/dashboard';
import historyRoutes from './routes/history';
import cronRoutes from './routes/cron';
import collaboratorsRoutes from './routes/collaborators';
import sharedProjectsRoutes from './routes/shared-projects';
import projectsRoutes from './routes/projects';
import feedbackRoutes from './routes/feedback';
import path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // Limit each IP to 300 requests per minute (5 per second)
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
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 login attempts per 5 minutes
  message: {
    success: false,
    message: '登录尝试次数过多，请5分钟后再试',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Trust proxy - required for getting real client IP behind reverse proxy
app.set('trust proxy', 1);

// CORS configuration - support multiple origins from environment variable
// FRONTEND_URL can contain multiple domains separated by commas
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// More relaxed rate limiter for read-only endpoints
const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1200, // Limit each IP to 1200 requests per minute (20 per second)
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes except auth logout
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for logout endpoint
  if (req.path === '/auth/logout') {
    return next();
  }
  
  // Use more relaxed limiter for GET requests (read-only operations)
  if (req.method === 'GET') {
    return readLimiter(req, res, next);
  }
  
  return limiter(req, res, next);
});

// Apply stricter rate limiting to auth routes (login/register only)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(cookieParser());
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

// Test bcrypt endpoint
import { hashPassword, comparePassword } from './lib/password';
app.get('/test/bcrypt', async (req, res) => {
  try {
    const testPassword = 'Test123456';
    const start = Date.now();
    const hashed = await hashPassword(testPassword);
    const hashTime = Date.now() - start;
    
    const compareStart = Date.now();
    const isValid = await comparePassword(testPassword, hashed);
    const compareTime = Date.now() - compareStart;
    
    res.json({
      success: true,
      hashTime: `${hashTime}ms`,
      compareTime: `${compareTime}ms`,
      isValid,
      hashedLength: hashed.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/collaborators', collaboratorsRoutes);
app.use('/api/shared-projects', sharedProjectsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/feedback', feedbackRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Run database auto-migration on startup
  console.log('[Server] Running database migrations...');
  await autoMigrate();

  // Start the health check scheduler
  console.log('[Server] Starting health check scheduler...');
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  stopScheduler();
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  stopScheduler();
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

export default app;

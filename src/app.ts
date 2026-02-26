/**
 * app.ts — Express application bootstrap
 *
 * Initialises:
 *   - HTTP middleware stack (helmet, cors, morgan, cookie-parser, json)
 *   - API routes (/api/auth, /api/jobs)
 *   - Global error handler
 *   - WebSocket server (Socket.IO) for real-time messaging
 *   - Graceful shutdown handler (SIGTERM / SIGINT)
 */

import http from 'http';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env';
import { db } from './config/database';
import { redis } from './config/redis';
import { setIo } from './config/socket';
import { errorHandler } from './middleware/errorHandler.middleware';
import { requestIdMiddleware } from './middleware/auth.middleware';
import authRoutes from './routes/auth.routes';
import jobsRoutes from './routes/jobs.routes';
import profilesRoutes from './routes/profiles.routes';
import messagingRoutes from './routes/messaging.routes';
import reviewsRoutes from './routes/reviews.routes';
import disputesRoutes from './routes/disputes.routes';
import notificationsRoutes from './routes/notifications.routes';
import verificationsRoutes from './routes/verifications.routes';
import adminRoutes from './routes/admin.routes';

// ── Express App ───────────────────────────────────────────────────────────────

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'Retry-After'],
}));

// Structured request logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Attach request ID to every request for tracing
app.use(requestIdMiddleware);

// ── Health check (no auth) ────────────────────────────────────────────────────

app.get('/health', async (_req: Request, res: Response) => {
  const [dbHealth, redisOk] = await Promise.allSettled([
    db.healthCheck(),
    redis.ping().then(() => true).catch(() => false),
  ]);

  const db_ok = dbHealth.status === 'fulfilled' ? dbHealth.value.ok : false;
  const redis_ok = redisOk.status === 'fulfilled' ? redisOk.value : false;
  const status = db_ok && redis_ok ? 200 : 503;

  res.status(status).json({
    status: status === 200 ? 'ok' : 'degraded',
    db:    db_ok,
    redis: redis_ok,
    version: process.env.npm_package_version ?? '0.0.0',
    env: env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/conversations', messagingRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/verifications', verificationsRoutes);
app.use('/api/admin', adminRoutes);

// 404 catch-all
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────

app.use(errorHandler);

// ── HTTP Server ───────────────────────────────────────────────────────────────

const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make io available to services (e.g. messaging.service) via singleton
setIo(io);

// Basic auth guard for WebSocket connections
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const { verifyAccessToken } = require('./services/jwt.service');
    const payload = verifyAccessToken(token);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const userId: string = socket.data.user?.userId;
  if (!userId) { socket.disconnect(true); return; }

  // Join a personal room for targeted notifications
  socket.join(`user:${userId}`);

  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    // cleanup handled automatically by socket.io
  });
});

export { app, server, io };

// ── Entry Point ───────────────────────────────────────────────────────────────

if (require.main === module) {
  const PORT = env.PORT;

  server.listen(PORT, () => {
    console.log(`[Server] TradeConnect API running on port ${PORT} (${env.NODE_ENV})`);
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────────

  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down gracefully...`);

    server.close(async () => {
      console.log('[Server] HTTP server closed');

      try {
        await db.end();
        console.log('[Server] Database pool closed');
      } catch (err) {
        console.error('[Server] Error closing DB pool:', err);
      }

      try {
        await redis.quit();
        console.log('[Server] Redis connection closed');
      } catch (err) {
        console.error('[Server] Error closing Redis:', err);
      }

      console.log('[Server] Shutdown complete');
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught exception:', err);
    shutdown('uncaughtException');
  });
}

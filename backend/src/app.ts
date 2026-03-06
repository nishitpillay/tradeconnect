import './observability/tracing';
import http from 'http';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { env } from './config/env';
import { db } from './config/database';
import { redis } from './config/redis';
import { setIo } from './config/socket';
import { errorHandler } from './middleware/errorHandler.middleware';
import { requestContextMiddleware } from './middleware/requestContext.middleware';
import { httpLoggerMiddleware } from './middleware/httpLogger.middleware';
import { initSentry, Sentry } from './observability/sentry';
import { logger } from './observability/logger';
import { shutdownTracing } from './observability/tracing';
import { getReadiness } from './services/readiness.service';
import authRoutes from './routes/auth.routes';
import jobsRoutes from './routes/jobs.routes';
import profilesRoutes from './routes/profiles.routes';
import messagingRoutes from './routes/messaging.routes';
import reviewsRoutes from './routes/reviews.routes';
import disputesRoutes from './routes/disputes.routes';
import notificationsRoutes from './routes/notifications.routes';
import verificationsRoutes from './routes/verifications.routes';
import adminRoutes from './routes/admin.routes';
import { verifyAccessToken, isUserTokensInvalidated } from './services/jwt.service';
import * as userRepo from './repositories/user.repo';
import * as messagingRepo from './repositories/messaging.repo';
import { conversationRoom, LEGACY_SOCKET_EVENTS, SOCKET_EVENTS, userRoom } from './realtime/socket.events';

initSentry('tradeconnect-backend-api');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = env.CORS_ORIGINS
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'X-Correlation-Id',
    'X-CSRF-Token',
    'X-Device-Id',
  ],
  exposedHeaders: ['X-Request-Id', 'X-Correlation-Id', 'Retry-After'],
}));

app.use(requestContextMiddleware);
app.use(httpLoggerMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'tradeconnect-backend-api',
    env: env.NODE_ENV,
    version: process.env.npm_package_version ?? '0.0.0',
  });
});

app.get('/readyz', async (_req: Request, res: Response) => {
  const readiness = await getReadiness();
  res.status(readiness.ok ? 200 : 503).json(readiness);
});

app.get('/health', async (_req: Request, res: Response) => {
  const readiness = await getReadiness();
  res.status(readiness.ok ? 200 : 503).json({
    status: readiness.ok ? 'ok' : 'degraded',
    ...readiness.checks,
    version: process.env.npm_package_version ?? '0.0.0',
    env: env.NODE_ENV,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/conversations', messagingRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/verifications', verificationsRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: allowedOrigins, credentials: true },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: env.SOCKET_IO_MAX_HTTP_BUFFER_BYTES,
});

setIo(io);
const adapterPub = new Redis(env.REDIS_URL);
const adapterSub = adapterPub.duplicate();
if (env.SOCKET_IO_REDIS_ADAPTER_ENABLED) {
  io.adapter(createAdapter(adapterPub, adapterSub));
  logger.info('Socket.IO Redis adapter enabled');
}

const SOCKET_ROOM_ID_PATTERN = /^[0-9a-fA-F-]{8,64}$/;

interface ConversationEventPayload {
  conversationId: string;
}

interface EventAck {
  ok: boolean;
  code?: 'bad_payload' | 'forbidden' | 'not_found' | 'internal_error';
  message?: string;
}

function parseConversationPayload(raw: unknown): string | null {
  const conversationId =
    typeof raw === 'string'
      ? raw.trim()
      : typeof raw === 'object' && raw !== null && 'conversationId' in raw
        ? String((raw as ConversationEventPayload).conversationId).trim()
        : '';

  if (!conversationId || conversationId.length > 64 || !SOCKET_ROOM_ID_PATTERN.test(conversationId)) {
    return null;
  }

  const payloadSize = Buffer.byteLength(JSON.stringify({ conversationId }), 'utf8');
  if (payloadSize > env.SOCKET_IO_MAX_EVENT_PAYLOAD_BYTES) {
    return null;
  }

  return conversationId;
}

async function joinConversationRoom(
  socket: Socket,
  raw: unknown,
  ack?: (result: EventAck) => void
): Promise<void> {
  const conversationId = parseConversationPayload(raw);
  const userId = socket.data.user?.userId as string | undefined;
  const role = socket.data.user?.role as string | undefined;

  if (!conversationId || !userId) {
    ack?.({ ok: false, code: 'bad_payload', message: 'Invalid conversation id.' });
    return;
  }

  try {
    const isAllowed =
      role === 'admin'
        ? Boolean(await messagingRepo.findConversationById(conversationId))
        : await messagingRepo.isConversationParticipant(conversationId, userId);

    if (!isAllowed) {
      ack?.({ ok: false, code: 'forbidden', message: 'Conversation access denied.' });
      return;
    }

    socket.join(conversationRoom(conversationId));
    ack?.({ ok: true });
  } catch (error) {
    logger.error({ err: error, userId, conversationId }, 'Failed to join conversation room');
    ack?.({ ok: false, code: 'internal_error', message: 'Unable to join room.' });
  }
}

function leaveConversationRoom(
  socket: Socket,
  raw: unknown,
  ack?: (result: EventAck) => void
): void {
  const conversationId = parseConversationPayload(raw);
  if (!conversationId) {
    ack?.({ ok: false, code: 'bad_payload', message: 'Invalid conversation id.' });
    return;
  }
  socket.leave(conversationRoom(conversationId));
  ack?.({ ok: true });
}

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = verifyAccessToken(token);
    const invalidated = await isUserTokensInvalidated(payload.userId, payload.iat);
    if (invalidated) {
      return next(new Error('Token invalidated'));
    }

    const user = await userRepo.findById(payload.userId);
    if (!user || user.status === 'suspended' || user.status === 'deleted') {
      return next(new Error('User unavailable'));
    }

    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const userId: string = socket.data.user?.userId;
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.join(userRoom(userId));

  const onAuthRefresh = async (token: string, ack?: (ok: boolean) => void) => {
    try {
      const payload = verifyAccessToken(token);
      const invalidated = await isUserTokensInvalidated(payload.userId, payload.iat);
      if (invalidated) throw new Error('Token invalidated');
      socket.data.user = payload;
      ack?.(true);
    } catch {
      ack?.(false);
    }
  };

  socket.on(SOCKET_EVENTS.authRefresh, onAuthRefresh);
  socket.on(LEGACY_SOCKET_EVENTS.authRefresh, onAuthRefresh);

  socket.on(SOCKET_EVENTS.joinConversation, (payload: unknown, ack?: (result: EventAck) => void) => {
    void joinConversationRoom(socket, payload, ack);
  });
  socket.on(LEGACY_SOCKET_EVENTS.joinConversation, (payload: unknown, ack?: (result: EventAck) => void) => {
    void joinConversationRoom(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.leaveConversation, (payload: unknown, ack?: (result: EventAck) => void) => {
    leaveConversationRoom(socket, payload, ack);
  });
  socket.on(LEGACY_SOCKET_EVENTS.leaveConversation, (payload: unknown, ack?: (result: EventAck) => void) => {
    leaveConversationRoom(socket, payload, ack);
  });
});

export { app, server, io };

if (require.main === module) {
  const PORT = env.PORT;

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: env.NODE_ENV }, 'TradeConnect API started');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Backend shutdown initiated');
    server.close(async () => {
      try {
        await db.end();
        await redis.quit();
        await Promise.allSettled([adapterPub.quit(), adapterSub.quit()]);
        await shutdownTracing();
        await Sentry.close(2_000);
        logger.info('Backend shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, 'Backend shutdown failed');
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection in backend');
    Sentry.captureException(reason);
  });
  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception in backend');
    Sentry.captureException(error);
    void shutdown('uncaughtException');
  });
}

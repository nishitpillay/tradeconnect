import { createHash } from 'node:crypto';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { env } from '../config/env';
import { contextualLogger } from '../observability/logger';

const log = contextualLogger({ component: 'notifications-queue' });
const tracer = trace.getTracer('tradeconnect-bullmq');

export interface NotificationJobData {
  userId: string;
  type: string;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface DeadLetterNotificationJobData {
  failedAt: string;
  queue: string;
  originalJobId: string | null;
  attemptsMade: number;
  reason: string;
  payload: NotificationJobData;
}

export const notificationQueueName = 'notifications';
export const notificationDeadLetterQueueName = 'notifications-dead-letter';

export const bullConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

export const notificationsQueue = new Queue<NotificationJobData>(notificationQueueName, {
  connection: bullConnection,
  prefix: env.QUEUE_PREFIX,
});

export const notificationsDeadLetterQueue = new Queue<DeadLetterNotificationJobData>(
  notificationDeadLetterQueueName,
  {
    connection: bullConnection,
    prefix: env.QUEUE_PREFIX,
  }
);

function buildDefaultIdempotencyKey(job: NotificationJobData): string {
  const hash = createHash('sha256');
  hash.update(job.userId);
  hash.update(job.type);
  hash.update(job.channel);
  hash.update(job.title);
  hash.update(job.body);
  hash.update(JSON.stringify(job.data ?? {}));
  return hash.digest('hex');
}

function buildDedupKey(jobId: string): string {
  return `${env.QUEUE_PREFIX}:dedupe:${notificationQueueName}:${jobId}`;
}

export async function enqueueNotification(job: NotificationJobData): Promise<void> {
  await tracer.startActiveSpan('bullmq.enqueue.notifications', async (span) => {
    try {
      const idempotencyKey = job.idempotencyKey ?? buildDefaultIdempotencyKey(job);
      const jobId = `notif-${idempotencyKey}`;
      const dedupeKey = buildDedupKey(jobId);

      const dedupeResult = await bullConnection.set(
        dedupeKey,
        '1',
        'EX',
        env.NOTIFICATION_DEDUPE_TTL_SECONDS,
        'NX'
      );

      if (dedupeResult !== 'OK') {
        log.info({ jobId, dedupeKey }, 'Skipped duplicate notification enqueue');
        span.setAttribute('bullmq.deduped', true);
        span.setStatus({ code: SpanStatusCode.OK });
        return;
      }

      await notificationsQueue.add('send-notification', job, {
        jobId,
        attempts: env.NOTIFICATION_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: env.NOTIFICATION_BACKOFF_MS },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      });

      span.setAttribute('bullmq.job_id', jobId);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

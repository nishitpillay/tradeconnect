import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { env } from '../config/env';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export interface NotificationJobData {
  userId: string;
  type: string;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const notificationQueueName = 'notifications';

export const bullConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

export const notificationsQueue = new Queue<NotificationJobData>(notificationQueueName, {
  connection: bullConnection,
  prefix: env.QUEUE_PREFIX,
});

const tracer = trace.getTracer('tradeconnect-bullmq');

export async function enqueueNotification(job: NotificationJobData): Promise<void> {
  await tracer.startActiveSpan('bullmq.enqueue.notifications', async (span) => {
    try {
      await notificationsQueue.add('send-notification', job, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      });
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

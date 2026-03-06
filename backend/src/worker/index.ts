import '../observability/tracing';
import { QueueEvents, Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../observability/logger';
import { initSentry, Sentry } from '../observability/sentry';
import { shutdownTracing } from '../observability/tracing';
import {
  bullConnection,
  notificationQueueName,
  notificationDeadLetterQueueName,
  NotificationJobData,
  DeadLetterNotificationJobData,
  notificationsQueue,
  notificationsDeadLetterQueue,
} from '../queues/notifications.queue';
import { processNotificationJob } from './processors/notifications.processor';

initSentry('tradeconnect-worker');

const worker = new Worker<NotificationJobData>(
  notificationQueueName,
  processNotificationJob,
  {
    connection: bullConnection,
    concurrency: env.WORKER_CONCURRENCY,
    prefix: env.QUEUE_PREFIX,
    metrics: { maxDataPoints: 1000 },
  }
);

const queueEvents = new QueueEvents(notificationQueueName, {
  connection: bullConnection,
  prefix: env.QUEUE_PREFIX,
});

async function moveToDeadLetter(job: Job<NotificationJobData>, error: Error): Promise<void> {
  const attempts = job.opts.attempts ?? env.NOTIFICATION_MAX_ATTEMPTS;
  if (job.attemptsMade < attempts) return;

  const deadLetterPayload: DeadLetterNotificationJobData = {
    failedAt: new Date().toISOString(),
    queue: notificationQueueName,
    originalJobId: job.id ?? null,
    attemptsMade: job.attemptsMade,
    reason: error.message,
    payload: job.data,
  };

  await notificationsDeadLetterQueue.add('dead-letter-notification', deadLetterPayload, {
    jobId: `dlq-${job.id ?? Date.now().toString()}`,
    removeOnComplete: false,
    removeOnFail: false,
  });
}

worker.on('ready', () => logger.info({ queue: notificationQueueName }, 'Worker ready'));
worker.on('active', (job) => {
  logger.info({ queue: notificationQueueName, jobId: job.id, name: job.name }, 'Job started');
});
worker.on('completed', (job) => {
  logger.info({ queue: notificationQueueName, jobId: job.id, attemptsMade: job.attemptsMade }, 'Job completed');
});
worker.on('failed', (job, error) => {
  logger.error({ queue: notificationQueueName, jobId: job?.id, err: error }, 'Job failed');
  if (job && env.WORKER_DLQ_ENABLED) {
    void moveToDeadLetter(job, error).catch((dlqError) => {
      logger.error({ err: dlqError, jobId: job.id }, 'Failed to move job to dead-letter queue');
      Sentry.captureException(dlqError, {
        tags: { component: 'worker', queue: notificationDeadLetterQueueName },
        extra: { originalJobId: job.id },
      });
    });
  }
  Sentry.captureException(error, {
    tags: { component: 'worker', queue: notificationQueueName },
    extra: { jobId: job?.id, jobName: job?.name },
  });
});
worker.on('error', (error) => {
  logger.error({ err: error }, 'Worker error');
  Sentry.captureException(error, { tags: { component: 'worker' } });
});

queueEvents.on('completed', ({ jobId }) => {
  logger.info({ queue: notificationQueueName, jobId }, 'Queue event completed');
});
queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.warn({ queue: notificationQueueName, jobId, failedReason }, 'Queue event failed');
});
queueEvents.on('error', (error) => {
  logger.error({ err: error }, 'QueueEvents error');
});

const metricsInterval = setInterval(async () => {
  try {
    const [primaryCounts, deadLetterCounts] = await Promise.all([
      notificationsQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      notificationsDeadLetterQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    ]);
    logger.info(
      {
        queue: notificationQueueName,
        counts: primaryCounts,
        deadLetterQueue: notificationDeadLetterQueueName,
        deadLetterCounts,
      },
      'Queue metrics snapshot'
    );
  } catch (error) {
    logger.error({ err: error }, 'Queue metrics snapshot failed');
  }
}, env.WORKER_METRICS_INTERVAL_MS);
metricsInterval.unref();

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Worker shutdown initiated');
  try {
    clearInterval(metricsInterval);
    await queueEvents.close();
    await worker.close();
    await notificationsQueue.close();
    await notificationsDeadLetterQueue.close();
    await bullConnection.quit();
    await shutdownTracing();
    await Sentry.close(2_000);
    logger.info('Worker shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Worker shutdown failed');
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in worker');
  Sentry.captureException(reason);
});
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception in worker');
  Sentry.captureException(error);
  void shutdown('uncaughtException');
});

import './observability/tracing';
import { Worker } from 'bullmq';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { env } from './config/env';
import { logger } from './observability/logger';
import { initSentry, Sentry } from './observability/sentry';
import { shutdownTracing } from './observability/tracing';
import { bullConnection, notificationQueueName, NotificationJobData } from './queues/notifications.queue';
import { notifyAsync } from './services/notification.service';

initSentry('tradeconnect-worker');

const tracer = trace.getTracer('tradeconnect-worker');

const worker = new Worker<NotificationJobData>(
  notificationQueueName,
  async (job) => tracer.startActiveSpan('bullmq.process.notification', async (span) => {
    try {
      span.setAttribute('bullmq.job.id', job.id ?? '');
      span.setAttribute('bullmq.job.name', job.name);
      span.setAttribute('notification.channel', job.data.channel);
      span.setAttribute('notification.type', job.data.type);

      await notifyAsync({
        userId: job.data.userId,
        type: job.data.type,
        channel: job.data.channel,
        title: job.data.title,
        body: job.data.body,
        data: job.data.data,
      });

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      Sentry.captureException(error, {
        tags: { component: 'worker', queue: notificationQueueName },
        extra: { jobId: job.id, jobName: job.name },
      });
      throw error;
    } finally {
      span.end();
    }
  }),
  {
    connection: bullConnection,
    concurrency: env.WORKER_CONCURRENCY,
    prefix: env.QUEUE_PREFIX,
  }
);

worker.on('ready', () => logger.info({ queue: notificationQueueName }, 'Worker ready'));
worker.on('active', (job) => logger.info({ queue: notificationQueueName, jobId: job.id }, 'Job started'));
worker.on('completed', (job) => logger.info({ queue: notificationQueueName, jobId: job.id }, 'Job completed'));
worker.on('failed', (job, error) => {
  logger.error({ queue: notificationQueueName, jobId: job?.id, err: error }, 'Job failed');
});
worker.on('error', (error) => {
  logger.error({ err: error }, 'Worker error');
  Sentry.captureException(error, { tags: { component: 'worker' } });
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Worker shutdown initiated');
  try {
    await worker.close();
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

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in worker');
  Sentry.captureException(reason);
});
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception in worker');
  Sentry.captureException(error);
  void shutdown('uncaughtException');
});

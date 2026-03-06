import { Job } from 'bullmq';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { NotificationJobData } from '../../queues/notifications.queue';
import { notifyAsync } from '../../services/notification.service';

const tracer = trace.getTracer('tradeconnect-worker');

export async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  await tracer.startActiveSpan('bullmq.process.notification', async (span) => {
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
      throw error;
    } finally {
      span.end();
    }
  });
}

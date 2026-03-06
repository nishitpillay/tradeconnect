import { randomUUID } from 'node:crypto';
import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { db } from '../config/database';
import { notifyAsync } from '../services/notification.service';

type SmokeJob = {
  userId: string;
  type: string;
  channel: 'in_app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

async function main(): Promise<void> {
  const userResult = await db.query<{ id: string }>(
    `SELECT id FROM users WHERE status = 'active' ORDER BY created_at ASC LIMIT 1`
  );
  const userId = userResult.rows[0]?.id;
  if (!userId) {
    throw new Error('queue-smoke requires at least one active user in the database');
  }

  const queueName = 'notifications-smoke';
  const title = `Queue smoke ${new Date().toISOString()} ${randomUUID().slice(0, 8)}`;
  const body = 'Queue smoke test message';

  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue<SmokeJob>(queueName, { connection, prefix: env.QUEUE_PREFIX });
  const worker = new Worker<SmokeJob>(
    queueName,
    async (job) => {
      await notifyAsync({
        userId: job.data.userId,
        type: job.data.type,
        channel: job.data.channel,
        title: job.data.title,
        body: job.data.body,
        data: job.data.data,
      });
    },
    { connection, prefix: env.QUEUE_PREFIX, concurrency: 1 }
  );

  try {
    const completion = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('queue-smoke timed out waiting for job completion')), 20_000);
      worker.once('completed', () => {
        clearTimeout(timer);
        resolve();
      });
      worker.once('failed', (_job, err) => {
        clearTimeout(timer);
        reject(err ?? new Error('queue-smoke job failed'));
      });
    });

    await queue.add('send-notification', {
      userId,
      type: 'new_message',
      channel: 'in_app',
      title,
      body,
      data: { smoke: true },
    });

    await completion;

    const notification = await db.query<{ id: string }>(
      `SELECT id
       FROM notifications
       WHERE user_id = $1 AND title = $2 AND body = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, title, body]
    );

    if (!notification.rows[0]) {
      throw new Error('queue-smoke did not find persisted notification after completion');
    }

    // cleanup test row to keep environments tidy
    await db.query(`DELETE FROM notifications WHERE id = $1`, [notification.rows[0].id]);
    console.log('queue-smoke passed');
  } finally {
    await worker.close();
    await queue.close();
    await connection.quit();
    await db.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

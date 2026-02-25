/**
 * Notification Service
 *
 * Provides a unified interface for sending notifications across channels.
 * Push and Email are stubbed — replace stubs with real Firebase Admin / AWS SES calls.
 *
 * All calls are fire-and-forget from the caller's perspective.
 * Failures are logged but never propagate to the API response.
 */

import { db } from '../config/database';

type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

export interface NotifyOptions {
  userId: string;
  type: string;        // e.g. 'job_awarded', 'new_quote', 'message_received'
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;  // extra payload for deep-linking
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a notification (fire-and-forget).
 * Persists to DB and dispatches to the appropriate channel.
 */
export function notify(opts: NotifyOptions): void {
  _send(opts).catch((err: Error) => {
    console.error('[Notification] Failed:', err.message, { userId: opts.userId, type: opts.type });
  });
}

/** Awaitable version for tests or cases needing confirmation. */
export async function notifyAsync(opts: NotifyOptions): Promise<void> {
  await _send(opts);
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _send(opts: NotifyOptions): Promise<void> {
  // Persist to DB first (in_app baseline)
  await db.query(
    `INSERT INTO notifications (user_id, type, channel, title, body, data)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      opts.userId,
      opts.type,
      opts.channel,
      opts.title,
      opts.body,
      opts.data ? JSON.stringify(opts.data) : null,
    ]
  );

  // Dispatch to channel-specific sender
  switch (opts.channel) {
    case 'push':
      await sendPush(opts);
      break;
    case 'email':
      await sendEmail(opts);
      break;
    case 'sms':
      await sendSms(opts);
      break;
    case 'in_app':
      // Already persisted above; real-time delivery handled by WebSocket layer
      break;
  }

  // Mark as sent
  await db.query(
    `UPDATE notifications SET sent_at = NOW()
     WHERE id = (
       SELECT id FROM notifications
       WHERE user_id = $1 AND type = $2 AND sent_at IS NULL
       ORDER BY created_at DESC LIMIT 1
     )`,
    [opts.userId, opts.type]
  );
}

// ── Channel stubs ─────────────────────────────────────────────────────────────

/**
 * Push notification via Firebase Cloud Messaging.
 * TODO: Replace stub with firebase-admin SDK call.
 *
 * @example
 *   const message = {
 *     notification: { title: opts.title, body: opts.body },
 *     data: opts.data ? stringifyValues(opts.data) : undefined,
 *     token: pushToken,  // retrieved from push_tokens table
 *   };
 *   await admin.messaging().send(message);
 */
async function sendPush(opts: NotifyOptions): Promise<void> {
  console.log('[Notification:push] STUB', { userId: opts.userId, title: opts.title });
  // Retrieve push tokens for user
  // const { rows } = await db.query(
  //   'SELECT token, platform FROM push_tokens WHERE user_id = $1',
  //   [opts.userId]
  // );
  // for (const { token } of rows) {
  //   await admin.messaging().send({ ... });
  // }
}

/**
 * Transactional email via AWS SES.
 * TODO: Replace stub with @aws-sdk/client-ses call.
 *
 * @example
 *   await sesClient.send(new SendEmailCommand({
 *     Source: 'noreply@tradeconnect.com.au',
 *     Destination: { ToAddresses: [recipientEmail] },
 *     Message: {
 *       Subject: { Data: opts.title },
 *       Body: { Text: { Data: opts.body } },
 *     },
 *   }));
 */
async function sendEmail(opts: NotifyOptions): Promise<void> {
  console.log('[Notification:email] STUB', { userId: opts.userId, title: opts.title });
}

/**
 * SMS via Twilio or AWS SNS.
 * TODO: Implement when SMS provider is chosen.
 */
async function sendSms(opts: NotifyOptions): Promise<void> {
  console.log('[Notification:sms] STUB', { userId: opts.userId, title: opts.title });
}

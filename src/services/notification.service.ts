/**
 * Notification Service
 *
 * Unified interface for sending notifications across channels.
 * All calls are fire-and-forget from the caller's perspective.
 * Failures are logged but never propagate to the API response.
 *
 * Channels:
 *  - push    -> Firebase Cloud Messaging (FCM) via firebase-admin
 *  - email   -> AWS SES via @aws-sdk/client-ses
 *  - sms     -> Stub (implement when SMS provider is chosen)
 *  - in_app  -> Persisted to DB + real-time via Socket.IO layer
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { db } from '../config/database';
import { env } from '../config/env';
import { getMessaging } from '../config/firebase';

// ── SES client ────────────────────────────────────────────────────────────────

const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const SES_FROM = 'TradeConnect <noreply@tradeconnect.com.au>';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

export interface NotifyOptions {
  userId:  string;
  type:    string;
  channel: NotificationChannel;
  title:   string;
  body:    string;
  data?:   Record<string, unknown>;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fire-and-forget notification. Persists to DB and dispatches to channel. */
export function notify(opts: NotifyOptions): void {
  _send(opts).catch((err: Error) => {
    console.error('[Notification] Failed', { userId: opts.userId, type: opts.type, err: err.message });
  });
}

/** Awaitable variant for cases needing confirmation or testing. */
export async function notifyAsync(opts: NotifyOptions): Promise<void> {
  await _send(opts);
}

// ── Orchestration ─────────────────────────────────────────────────────────────

async function _send(opts: NotifyOptions): Promise<void> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO notifications (user_id, type, channel, title, body, data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [opts.userId, opts.type, opts.channel, opts.title, opts.body,
     opts.data ? JSON.stringify(opts.data) : null]
  );

  const notificationId = rows[0]?.id;

  try {
    switch (opts.channel) {
      case 'push':   await sendPush(opts);  break;
      case 'email':  await sendEmail(opts); break;
      case 'sms':    await sendSms(opts);   break;
      case 'in_app': break; // persisted above; Socket.IO delivers real-time
    }

    if (notificationId) {
      await db.query(`UPDATE notifications SET sent_at = NOW() WHERE id = $1`, [notificationId]);
    }
  } catch (err) {
    if (notificationId) {
      await db.query(
        `UPDATE notifications SET failed = TRUE, failure_reason = $2 WHERE id = $1`,
        [notificationId, err instanceof Error ? err.message : String(err)]
      );
    }
    throw err;
  }
}

// ── Push (Firebase FCM) ───────────────────────────────────────────────────────

async function sendPush(opts: NotifyOptions): Promise<void> {
  const { rows } = await db.query<{ fcm_token: string | null }>(
    `SELECT fcm_token FROM users WHERE id = $1 AND push_enabled = TRUE AND status = 'active'`,
    [opts.userId]
  );

  const token = rows[0]?.fcm_token;
  if (!token) return;

  const stringData: Record<string, string> = { notificationType: opts.type };
  if (opts.data) {
    for (const [k, v] of Object.entries(opts.data)) {
      stringData[k] = String(v);
    }
  }

  try {
    await getMessaging().send({
      token,
      notification: { title: opts.title, body: opts.body },
      data: stringData,
      android: { priority: 'high', notification: { channelId: 'default' } },
      apns: {
        payload: {
          aps: { alert: { title: opts.title, body: opts.body }, sound: 'default', badge: 1 },
        },
      },
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      // Stale token — clear it to avoid repeated failures
      await db.query(
        `UPDATE users SET fcm_token = NULL WHERE id = $1 AND fcm_token = $2`,
        [opts.userId, token]
      );
    } else {
      throw err;
    }
  }
}

// ── Email (AWS SES) ───────────────────────────────────────────────────────────

async function sendEmail(opts: NotifyOptions): Promise<void> {
  const { rows } = await db.query<{ email: string; full_name: string }>(
    `SELECT email, full_name FROM users
     WHERE id = $1 AND email_notifications = TRUE AND email_verified = TRUE AND status = 'active'`,
    [opts.userId]
  );

  const user = rows[0];
  if (!user) return; // opted out or unverified

  const toAddress = user.full_name ? `${user.full_name} <${user.email}>` : user.email;

  await ses.send(
    new SendEmailCommand({
      Source:      SES_FROM,
      Destination: { ToAddresses: [toAddress] },
      Message: {
        Subject: { Data: opts.title, Charset: 'UTF-8' },
        Body: {
          Text: { Data: opts.body, Charset: 'UTF-8' },
          Html: { Data: buildHtmlEmail(opts.title, opts.body), Charset: 'UTF-8' },
        },
      },
    })
  );
}

function buildHtmlEmail(title: string, body: string): string {
  const t = escapeHtml(title);
  const b = escapeHtml(body).replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#FFFFFF;border-radius:8px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td>
          <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">${t}</h1>
          <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">${b}</p>
          <a href="https://tradeconnect.com.au"
             style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;
                    padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
            Open TradeConnect
          </a>
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0 16px;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            TradeConnect &middot; Australia &middot;
            <a href="https://tradeconnect.com.au/unsubscribe" style="color:#6B7280;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── SMS ───────────────────────────────────────────────────────────────────────

async function sendSms(opts: NotifyOptions): Promise<void> {
  // TODO: Implement with Twilio or AWS SNS when SMS provider is chosen.
  // Example Twilio:
  //   const { rows } = await db.query('SELECT phone FROM users WHERE id = $1', [opts.userId]);
  //   if (rows[0]?.phone) {
  //     await twilioClient.messages.create({ from: env.TWILIO_FROM, to: rows[0].phone, body: opts.body });
  //   }
  console.debug('[Notification:sms] Not yet implemented', { userId: opts.userId });
}

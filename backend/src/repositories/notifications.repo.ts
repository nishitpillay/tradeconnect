import { db } from '../config/database';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'quote_received'
  | 'quote_viewed'
  | 'quote_shortlisted'
  | 'quote_awarded'
  | 'quote_rejected'
  | 'quote_withdrawn'
  | 'job_posted'
  | 'job_awarded'
  | 'job_in_progress'
  | 'job_completed'
  | 'job_cancelled'
  | 'job_expired'
  | 'job_expiring_soon'
  | 'new_message'
  | 'review_received'
  | 'verification_approved'
  | 'verification_rejected'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'account_suspended'
  | 'account_warning'
  | 'account_banned';

export interface Notification {
  id:             string;
  user_id:        string;
  type:           NotificationType;
  channel:        'push' | 'email' | 'in_app';
  title:          string;
  body:           string;
  data:           Record<string, unknown> | null;
  is_read:        boolean;
  read_at:        Date | null;
  sent_at:        Date | null;
  failed:         boolean;
  failure_reason: string | null;
  created_at:     Date;
}

interface NotificationCursor {
  created_at: string;
  id:         string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function findNotificationById(id: string): Promise<Notification | null> {
  const { rows } = await db.query<Notification>(
    'SELECT * FROM notifications WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function findNotificationsByUser(
  userId: string,
  cursor?: string,
  limit = 20,
  isRead?: boolean
): Promise<{ notifications: Notification[]; nextCursor: string | null }> {
  const pageSize = Math.min(limit, 50);
  const conditions: string[] = ['user_id = $1'];
  const values: (string | number | boolean | null)[] = [userId];
  let idx = 2;

  if (isRead !== undefined) {
    conditions.push(`is_read = $${idx++}`);
    values.push(isRead);
  }

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(
        `(created_at < $${idx++} OR (created_at = $${idx++} AND id > $${idx++}))`
      );
      values.push(decoded.created_at, decoded.created_at, decoded.id);
    }
  }

  const where = conditions.join(' AND ');
  const { rows } = await db.query<Notification>(
    `SELECT * FROM notifications
     WHERE ${where}
     ORDER BY created_at DESC, id ASC
     LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  const hasMore = rows.length > pageSize;
  const notifications = hasMore ? rows.slice(0, pageSize) : rows;
  const last = notifications[notifications.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
    : null;

  return { notifications, nextCursor };
}

export async function countUnreadByUser(userId: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return rows[0]?.count ?? 0;
}

export async function markNotificationRead(
  id: string,
  userId: string
): Promise<Notification | null> {
  const { rows } = await db.query<Notification>(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function markAllNotificationsRead(userId: string): Promise<{ updated: number }> {
  const result = await db.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return { updated: result.rowCount ?? 0 };
}

// ── Cursor Helpers ────────────────────────────────────────────────────────────

function encodeCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

function decodeCursor(encoded: string): NotificationCursor | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    return JSON.parse(json) as NotificationCursor;
  } catch {
    return null;
  }
}

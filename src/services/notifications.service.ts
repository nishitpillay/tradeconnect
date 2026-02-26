import { Errors } from '../middleware/errors';
import * as notificationsRepo from '../repositories/notifications.repo';
import type { Notification } from '../repositories/notifications.repo';
import type { ListNotificationsQuery } from '../schemas/notifications.schema';

// ── List Notifications ────────────────────────────────────────────────────────

export async function listNotifications(
  userId: string,
  query: ListNotificationsQuery
): Promise<{ notifications: Notification[]; nextCursor: string | null }> {
  return notificationsRepo.findNotificationsByUser(
    userId,
    query.cursor,
    query.limit,
    query.is_read
  );
}

// ── Unread Count ──────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<{ count: number }> {
  const count = await notificationsRepo.countUnreadByUser(userId);
  return { count };
}

// ── Mark Single Notification Read ─────────────────────────────────────────────

export async function markRead(
  userId: string,
  notificationId: string
): Promise<Notification> {
  const notification = await notificationsRepo.findNotificationById(notificationId);
  if (!notification) throw Errors.notFound('Notification');

  if (notification.user_id !== userId) throw Errors.forbidden();

  if (notification.is_read) return notification;

  const updated = await notificationsRepo.markNotificationRead(notificationId, userId);
  return updated ?? notification;
}

// ── Mark All Notifications Read ───────────────────────────────────────────────

export async function markAllRead(userId: string): Promise<{ updated: number }> {
  return notificationsRepo.markAllNotificationsRead(userId);
}

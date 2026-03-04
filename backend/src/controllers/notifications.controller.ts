import { Request, Response, NextFunction } from 'express';
import * as notificationsService from '../services/notifications.service';
import type { ListNotificationsQuery } from '../schemas/notifications.schema';

// ── GET /api/notifications ────────────────────────────────────────────────────

export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: ListNotificationsQuery }).parsedQuery;
    const result = await notificationsService.listNotifications(req.user!.userId, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/notifications/unread-count ───────────────────────────────────────

export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await notificationsService.getUnreadCount(req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────

export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const notification = await notificationsService.markRead(
      req.user!.userId,
      req.params.id
    );
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/notifications/read-all ─────────────────────────────────────────

export async function markAllRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await notificationsService.markAllRead(req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

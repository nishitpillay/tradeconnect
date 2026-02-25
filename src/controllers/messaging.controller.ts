import { Request, Response, NextFunction } from 'express';
import * as messagingService from '../services/messaging.service';

// ── GET /api/conversations ────────────────────────────────────────────────────

export async function listConversations(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const conversations = await messagingService.listConversations(req.user!.userId);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/conversations ───────────────────────────────────────────────────

export async function openConversation(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { job_id, customer_id } = req.body as { job_id: string; customer_id: string };
    const conversation = await messagingService.openConversation(
      req.user!.userId,
      job_id,
      customer_id
    );
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/conversations/:id ────────────────────────────────────────────────

export async function getConversation(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const conversation = await messagingService.getConversation(
      req.user!.userId,
      req.params.id
    );
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/conversations/:id/messages ───────────────────────────────────────

export async function listMessages(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { before, limit } = req.query as { before?: string; limit?: string };
    const messages = await messagingService.getMessages(
      req.user!.userId,
      req.params.id,
      before,
      limit ? Number(limit) : undefined
    );
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/conversations/:id/messages ──────────────────────────────────────

export async function sendMessage(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { body } = req.body as { body: string };
    const message = await messagingService.sendMessage(
      req.user!.userId,
      req.params.id,
      body
    );
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/conversations/:id/read ────────────────────────────────────────

export async function markAsRead(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    await messagingService.markAsRead(req.user!.userId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/conversations/:id/messages/:msgId ─────────────────────────────

export async function deleteMessage(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const message = await messagingService.deleteMessage(
      req.user!.userId,
      req.user!.role,
      req.params.id,
      req.params.msgId
    );
    res.json({ message });
  } catch (err) {
    next(err);
  }
}

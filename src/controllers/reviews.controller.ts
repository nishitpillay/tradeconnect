import { Request, Response, NextFunction } from 'express';
import * as reviewsService from '../services/reviews.service';

// ── GET /api/jobs/:id/reviews ─────────────────────────────────────────────────

export async function listJobReviews(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reviews = await reviewsService.getJobReviews(req.params.id);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/reviews/:id/response ──────────────────────────────────────────

export async function respondToReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { response } = req.body as { response: string };
    const review = await reviewsService.respondToReview(
      req.user!.userId,
      req.params.id,
      response
    );
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/reviews/:id ───────────────────────────────────────────────────

export async function hideReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const review = await reviewsService.adminHideReview(req.params.id);
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

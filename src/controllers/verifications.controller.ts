import { Request, Response, NextFunction } from 'express';
import * as verificationsService from '../services/verifications.service';
import type {
  UploadUrlInput,
  SubmitVerificationInput,
  ReviewVerificationInput,
  ListVerificationsQuery,
} from '../schemas/verifications.schema';

// ── POST /api/verifications/upload-url ────────────────────────────────────────

export async function getUploadUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await verificationsService.getUploadUrl(
      req.user!.userId,
      req.body as UploadUrlInput
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/verifications ───────────────────────────────────────────────────

export async function submitVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const verification = await verificationsService.submitVerification(
      req.user!.userId,
      req.body as SubmitVerificationInput
    );
    res.status(201).json({ verification });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/verifications ────────────────────────────────────────────────────

export async function listVerifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: ListVerificationsQuery }).parsedQuery;
    const result = await verificationsService.listVerifications(
      req.user!.userId,
      req.user!.role,
      query
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/verifications/:id ────────────────────────────────────────────────

export async function getVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const verification = await verificationsService.getVerification(
      req.user!.userId,
      req.user!.role,
      req.params.id
    );
    res.json({ verification });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/verifications/:id/review ──────────────────────────────────────

export async function reviewVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const verification = await verificationsService.reviewVerification(
      req.user!.userId,
      req.params.id,
      req.body as ReviewVerificationInput
    );
    res.json({ verification });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import * as disputesService from '../services/disputes.service';
import type { RaiseDisputeInput, UpdateDisputeStatusInput, ListDisputesQuery } from '../schemas/disputes.schema';

// ── POST /api/disputes ────────────────────────────────────────────────────────

export async function raiseDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dispute = await disputesService.raiseDispute(
      req.user!.userId,
      req.user!.role,
      req.body as RaiseDisputeInput
    );
    res.status(201).json({ dispute });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/disputes ─────────────────────────────────────────────────────────

export async function listDisputes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: ListDisputesQuery }).parsedQuery;
    const result = await disputesService.listDisputes(
      req.user!.userId,
      req.user!.role,
      query
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/disputes/:id ─────────────────────────────────────────────────────

export async function getDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dispute = await disputesService.getDispute(
      req.user!.userId,
      req.user!.role,
      req.params.id
    );
    res.json({ dispute });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/disputes/:id/status ────────────────────────────────────────────

export async function updateDisputeStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dispute = await disputesService.updateDisputeStatus(
      req.user!.userId,
      req.params.id,
      req.body as UpdateDisputeStatusInput
    );
    res.json({ dispute });
  } catch (err) {
    next(err);
  }
}

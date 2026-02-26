import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import type {
  ListUsersQuery,
  ListJobsAdminQuery,
  ListReportsQuery,
  ListAuditLogsQuery,
} from '../schemas/admin.schema';

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await adminService.getStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: ListUsersQuery }).parsedQuery;
    const result = await adminService.listUsers(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.getUserById(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.updateUserStatus(
      req.user!.userId,
      req.params.id,
      req.body
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: ListJobsAdminQuery }).parsedQuery;
    const result = await adminService.listJobs(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function forceJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await adminService.forceJobStatus(
      req.user!.userId,
      req.params.id,
      req.body
    );
    const { exact_address_enc, ...safeJob } = job as typeof job & { exact_address_enc: unknown };
    res.json({ job: safeJob });
  } catch (err) {
    next(err);
  }
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: ListReportsQuery }).parsedQuery;
    const result = await adminService.listReports(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function reviewReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await adminService.reviewReport(
      req.user!.userId,
      req.params.id,
      req.body
    );
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: ListAuditLogsQuery }).parsedQuery;
    const result = await adminService.listAuditLogs(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

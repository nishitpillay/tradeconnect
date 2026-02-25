import { Request, Response, NextFunction } from 'express';
import * as jobService from '../services/job.service';
import * as jobRepo from '../repositories/job.repo';

// ── Create Job (draft) ────────────────────────────────────────────────────────

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobService.createJob(req.user!.userId, req.body);
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
}

// ── Publish ───────────────────────────────────────────────────────────────────

export async function publish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobService.publishJob(req.user!.userId, req.params.id);
    res.json({ job });
  } catch (err) {
    next(err);
  }
}

// ── List (Provider Feed) ──────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as {
      category_id?: string;
      max_distance_km?: string;
      budget_min?: string;
      budget_max?: string;
      cursor?: string;
      limit?: string;
    };

    const { jobs, nextCursor } = await jobService.getProviderFeed(req.user!.userId, {
      category_id:     query.category_id,
      max_distance_km: query.max_distance_km ? Number(query.max_distance_km) : undefined,
      budget_min:      query.budget_min      ? Number(query.budget_min)      : undefined,
      budget_max:      query.budget_max      ? Number(query.budget_max)      : undefined,
      cursor:          query.cursor,
      limit:           query.limit           ? Number(query.limit)           : undefined,
    });

    res.json({ jobs, nextCursor });
  } catch (err) {
    next(err);
  }
}

// ── Get By ID ─────────────────────────────────────────────────────────────────

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobRepo.findJobById(req.params.id);
    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }

    // Customers can see their own jobs; providers see published+
    const { userId, role } = req.user!;
    const isOwner    = job.customer_id === userId;
    const isProvider = role === 'provider';
    const isAdmin    = role === 'admin';

    if (!isOwner && !isProvider && !isAdmin) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Strip encrypted address from response (never expose enc blob)
    const { exact_address_enc, ...safeJob } = job as typeof job & { exact_address_enc: unknown };
    res.json({ job: safeJob });
  } catch (err) {
    next(err);
  }
}

// ── Patch ─────────────────────────────────────────────────────────────────────

export async function patch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobService.patchJob(req.user!.userId, req.params.id, req.body);
    const { exact_address_enc, ...safeJob } = job as typeof job & { exact_address_enc: unknown };
    res.json({ job: safeJob });
  } catch (err) {
    next(err);
  }
}

// ── Submit Quote ──────────────────────────────────────────────────────────────

export async function submitQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quote = await jobService.submitQuote(req.user!.userId, req.params.id, req.body);
    res.status(201).json({ quote });
  } catch (err) {
    next(err);
  }
}

// ── List Quotes ───────────────────────────────────────────────────────────────

export async function listQuotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobRepo.findJobById(req.params.id);
    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }

    // Only the job owner or admin can view all quotes
    if (job.customer_id !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const quotes = await jobRepo.findQuotesByJob(req.params.id);
    res.json({ quotes });
  } catch (err) {
    next(err);
  }
}

// ── Award ─────────────────────────────────────────────────────────────────────

export async function award(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { quote_id } = req.body as { quote_id: string };
    const { job, revealed_address } = await jobService.awardJob(
      req.user!.userId,
      req.params.id,
      quote_id
    );

    // revealed_address is ONLY returned in this response — never cached or logged
    const { exact_address_enc, ...safeJob } = job as typeof job & { exact_address_enc: unknown };
    res.json({
      job: safeJob,
      revealed_address,  // null if no exact address was provided at job creation
    });
  } catch (err) {
    next(err);
  }
}

// ── Accept (Provider) ─────────────────────────────────────────────────────────

export async function accept(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobService.acceptJob(req.user!.userId, req.params.id);
    const { exact_address_enc, ...safeJob } = job as typeof job & { exact_address_enc: unknown };
    res.json({ job: safeJob });
  } catch (err) {
    next(err);
  }
}

// ── Complete ──────────────────────────────────────────────────────────────────

export async function complete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobService.completeJob(req.user!.userId, req.params.id);
    const { exact_address_enc, ...safeJob } = job as typeof job & { exact_address_enc: unknown };
    res.json({ job: safeJob });
  } catch (err) {
    next(err);
  }
}

// ── Patch Quote (Customer: view / shortlist / reject) ─────────────────────────

export async function patchQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: jobId, quoteId } = req.params;
    const { action } = req.body as { action: 'viewed' | 'shortlisted' | 'rejected' };

    let quote;
    if (action === 'viewed') {
      quote = await jobService.viewQuote(req.user!.userId, jobId, quoteId);
    } else if (action === 'shortlisted') {
      quote = await jobService.shortlistQuote(req.user!.userId, jobId, quoteId);
    } else {
      quote = await jobService.rejectQuote(req.user!.userId, jobId, quoteId);
    }

    res.json({ quote });
  } catch (err) {
    next(err);
  }
}

// ── Withdraw Quote (Provider) ─────────────────────────────────────────────────

export async function withdrawQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: jobId, quoteId } = req.params;
    const quote = await jobService.withdrawQuote(req.user!.userId, jobId, quoteId);
    res.json({ quote });
  } catch (err) {
    next(err);
  }
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cancellation_reason } = req.body as { cancellation_reason?: string };
    const job = await jobService.cancelJob(req.user!.userId, req.params.id, cancellation_reason ?? '');
    const { exact_address_enc, ...safeJob } = job as typeof job & { exact_address_enc: unknown };
    res.json({ job: safeJob });
  } catch (err) {
    next(err);
  }
}

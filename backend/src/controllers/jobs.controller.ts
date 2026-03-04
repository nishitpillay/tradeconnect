import { Request, Response, NextFunction } from 'express';
import * as jobService from '../services/job.service';
import * as jobRepo from '../repositories/job.repo';
import * as reviewsService from '../services/reviews.service';
import type { JobFeedQuery, MyJobsQuery } from '../schemas/job.schema';

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

// ── List My Jobs (Customer) ───────────────────────────────────────────────────

export async function myJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: MyJobsQuery }).parsedQuery;
    const result = await jobService.listMyJobs(req.user!.userId, query);
    // Strip encrypted address blobs from all jobs
    const jobs = result.jobs.map(({ exact_address_enc, ...j }) => j);
    res.json({ jobs, nextCursor: result.nextCursor });
  } catch (err) {
    next(err);
  }
}

// ── List (Provider Feed) ──────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req as Request & { parsedQuery: JobFeedQuery }).parsedQuery;

    const { jobs, nextCursor } = await jobService.getProviderFeed(req.user!.userId, {
      category_id:     query.category_id,
      state:           query.state,
      urgency:         query.urgency,
      max_distance_km: query.radius_km,
      budget_min:      query.budget_min,
      budget_max:      query.budget_max,
      sort:            query.sort,
      cursor:          query.cursor,
      limit:           query.limit,
    });

    // Strip encrypted address blobs
    const safeJobs = jobs.map(({ exact_address_enc, ...j }) => j);
    res.json({ jobs: safeJobs, nextCursor });
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
    const { quote_id } = req.body as { quote_id: string };  // validated by AwardJobSchema
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

// ── Submit Review (Customer) ──────────────────────────────────────────────────

export async function submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await reviewsService.submitReview(
      req.user!.userId,
      req.params.id,
      req.body
    );
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}

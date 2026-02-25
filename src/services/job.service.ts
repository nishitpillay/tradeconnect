/**
 * Job Service
 *
 * Business logic for the job lifecycle:
 *   draft → posted → awarded → in_progress → completed
 *                          ↘ cancelled (at most states)
 */

import { db } from '../config/database';
import { env } from '../config/env';
import * as jobRepo from '../repositories/job.repo';
import { writeLog } from './audit.service';
import { notify } from './notification.service';
import { Errors } from '../middleware/errors';
import type {
  CreateJobInput,
  PatchJobInput,
  FeedQuery,
  Job,
  Quote,
  CreateQuoteInput,
} from '../repositories/job.repo';

// ── Create Job (draft) ────────────────────────────────────────────────────────

export async function createJob(
  customerId: string,
  input: Omit<CreateJobInput, 'customer_id'>
): Promise<Job> {
  const job = await jobRepo.createJob({ ...input, customer_id: customerId });

  writeLog({
    action: 'job_created',
    actorId: customerId,
    targetType: 'job',
    targetId: job.id,
    after: { status: job.status },
  });

  return job;
}

// ── Publish Job ───────────────────────────────────────────────────────────────

export async function publishJob(customerId: string, jobId: string): Promise<Job> {
  const job = await requireJob(jobId);

  if (job.customer_id !== customerId) throw Errors.forbidden('Not your job');
  if (job.status !== 'draft') throw Errors.badRequest('Only draft jobs can be published');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.JOB_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const updated = await jobRepo.updateJobStatus(jobId, 'posted', {
    published_at: now,
    expires_at: expiresAt,
  });

  writeLog({
    action: 'job_published',
    actorId: customerId,
    targetType: 'job',
    targetId: jobId,
    before: { status: 'draft' },
    after: { status: 'posted' },
  });

  return updated!;
}

// ── Patch Job ─────────────────────────────────────────────────────────────────

export async function patchJob(
  customerId: string,
  jobId: string,
  input: PatchJobInput
): Promise<Job> {
  const job = await requireJob(jobId);

  if (job.customer_id !== customerId) throw Errors.forbidden('Not your job');
  if (!['draft', 'posted'].includes(job.status)) {
    throw Errors.badRequest('Job cannot be edited in its current status');
  }

  const updated = await jobRepo.patchJob(jobId, input);

  writeLog({
    action: 'job_updated',
    actorId: customerId,
    targetType: 'job',
    targetId: jobId,
    after: input as Record<string, unknown>,
  });

  return updated!;
}

// ── Submit Quote ──────────────────────────────────────────────────────────────

export async function submitQuote(
  providerId: string,
  jobId: string,
  input: Omit<CreateQuoteInput, 'job_id' | 'provider_id'>
): Promise<Quote> {
  const job = await requireJob(jobId);

  if (!['posted', 'quoting'].includes(job.status)) {
    throw Errors.badRequest('Job is not accepting quotes');
  }

  const quote = await jobRepo.createQuote({
    job_id: jobId,
    provider_id: providerId,
    ...input,
  });

  // Transition job to 'quoting' if it's still in 'posted' state
  if (job.status === 'posted') {
    await jobRepo.updateJobStatus(jobId, 'quoting');
  }

  notify({
    userId: job.customer_id,
    type: 'quote_received',
    channel: 'push',
    title: 'New quote received',
    body: `A provider has submitted a quote for your job.`,
    data: { jobId, quoteId: quote.id },
  });

  writeLog({
    action: 'quote_submitted',
    actorId: providerId,
    targetType: 'quote',
    targetId: quote.id,
    after: { job_id: jobId, quote_type: input.quote_type },
  });

  return quote;
}

// ── Award Job ─────────────────────────────────────────────────────────────────

export async function awardJob(
  customerId: string,
  jobId: string,
  quoteId: string
): Promise<{ job: Job; revealed_address: string | null }> {
  const job = await requireJob(jobId);

  if (job.customer_id !== customerId) throw Errors.forbidden('Not your job');
  if (job.status !== 'quoting') {
    throw Errors.badRequest('Job must be in quoting state to award (providers must have submitted quotes first)');
  }

  const quote = await jobRepo.findQuoteById(quoteId);
  if (!quote || quote.job_id !== jobId) throw Errors.notFound('Quote not found on this job');
  if (quote.status !== 'pending' && quote.status !== 'viewed' && quote.status !== 'shortlisted') {
    throw Errors.badRequest('Quote is not in an awardable state');
  }

  const { job: awardedJob, decryptedAddress } = await db.withTransaction(async (client) => {
    return jobRepo.awardJob(jobId, quoteId, client);
  });

  // Notify awarded provider
  notify({
    userId: quote.provider_id,
    type: 'job_awarded',
    channel: 'push',
    title: 'You got the job!',
    body: `Your quote has been accepted. You can now view the job address.`,
    data: { jobId, quoteId },
  });

  writeLog({
    action: 'job_awarded',
    actorId: customerId,
    targetType: 'job',
    targetId: jobId,
    before: { status: job.status },
    after: { status: 'awarded', awarded_quote_id: quoteId },
  });

  return { job: awardedJob, revealed_address: decryptedAddress };
}

// ── Accept Job (Provider confirms) ───────────────────────────────────────────

export async function acceptJob(providerId: string, jobId: string): Promise<Job> {
  const job = await requireJob(jobId);

  if (job.status !== 'awarded') throw Errors.badRequest('Job must be awarded to accept');

  // Verify this provider holds the awarded quote
  const quote = await jobRepo.findQuoteById(job.awarded_quote_id!);
  if (!quote || quote.provider_id !== providerId) {
    throw Errors.forbidden('You are not the awarded provider for this job');
  }

  const updated = await jobRepo.updateJobStatus(jobId, 'in_progress');

  notify({
    userId: job.customer_id,
    type: 'job_in_progress',
    channel: 'push',
    title: 'Work has started',
    body: `Your provider has accepted the job and work is now in progress.`,
    data: { jobId },
  });

  writeLog({
    action: 'job_updated',
    actorId: providerId,
    targetType: 'job',
    targetId: jobId,
    before: { status: 'awarded' },
    after: { status: 'in_progress' },
  });

  return updated!;
}

// ── Complete Job ──────────────────────────────────────────────────────────────

export async function completeJob(customerId: string, jobId: string): Promise<Job> {
  const job = await requireJob(jobId);

  if (job.customer_id !== customerId) throw Errors.forbidden('Not your job');
  if (job.status !== 'in_progress') {
    throw Errors.badRequest('Job must be in_progress to complete');
  }

  const updated = await jobRepo.updateJobStatus(jobId, 'completed', {
    completed_at: new Date(),
  });

  // Notify provider
  const quote = job.awarded_quote_id ? await jobRepo.findQuoteById(job.awarded_quote_id) : null;
  if (quote) {
    notify({
      userId: quote.provider_id,
      type: 'job_completed',
      channel: 'push',
      title: 'Job marked complete',
      body: 'The customer has marked the job as complete.',
      data: { jobId },
    });
  }

  writeLog({
    action: 'job_completed',
    actorId: customerId,
    targetType: 'job',
    targetId: jobId,
    before: { status: 'in_progress' },
    after: { status: 'completed' },
  });

  return updated!;
}

// ── Cancel Job ────────────────────────────────────────────────────────────────

const CANCELLABLE_STATUSES: jobRepo.JobStatus[] = ['draft', 'posted', 'quoting', 'awarded', 'in_progress'];

export async function cancelJob(
  customerId: string,
  jobId: string,
  reason: string
): Promise<Job> {
  const job = await requireJob(jobId);

  if (job.customer_id !== customerId) throw Errors.forbidden('Not your job');
  if (!CANCELLABLE_STATUSES.includes(job.status)) {
    throw Errors.badRequest('Job cannot be cancelled in its current status');
  }

  const updated = await jobRepo.updateJobStatus(jobId, 'cancelled', {
    cancelled_at: new Date(),
    cancellation_reason: reason,
  });

  // Notify awarded provider if applicable
  if (job.awarded_quote_id) {
    const quote = await jobRepo.findQuoteById(job.awarded_quote_id);
    if (quote) {
      notify({
        userId: quote.provider_id,
        type: 'job_cancelled',
        channel: 'push',
        title: 'Job cancelled',
        body: `The customer has cancelled this job: ${reason}`,
        data: { jobId },
      });
    }
  }

  writeLog({
    action: 'job_cancelled',
    actorId: customerId,
    targetType: 'job',
    targetId: jobId,
    before: { status: job.status },
    after: { status: 'cancelled', reason },
  });

  return updated!;
}

// ── Feed ──────────────────────────────────────────────────────────────────────

export async function getProviderFeed(
  providerId: string,
  query: Omit<FeedQuery, 'provider_id'>
): Promise<{ jobs: Job[]; nextCursor: string | null }> {
  return jobRepo.findProviderFeed({ ...query, provider_id: providerId });
}

// ── Quote Actions (Customer) ──────────────────────────────────────────────────

export async function viewQuote(
  customerId: string,
  jobId: string,
  quoteId: string
): Promise<Quote> {
  const { job, quote } = await requireQuoteOnJob(jobId, quoteId);

  if (job.customer_id !== customerId) throw Errors.forbidden('Not your job');
  if (['awarded', 'rejected', 'withdrawn', 'expired'].includes(quote.status)) {
    throw Errors.badRequest('Quote is not in a modifiable state');
  }

  // No-op if already viewed/shortlisted — idempotent
  if (quote.status !== 'pending') return quote;

  const updated = await jobRepo.updateQuoteStatus(quoteId, 'viewed', { viewed_at: new Date() });

  notify({
    userId: quote.provider_id,
    type: 'quote_viewed',
    channel: 'in_app',
    title: 'Your quote was viewed',
    body: 'A customer has viewed your quote.',
    data: { jobId, quoteId },
  });

  writeLog({
    action: 'quote_updated',
    actorId: customerId,
    targetType: 'quote',
    targetId: quoteId,
    before: { status: quote.status },
    after: { status: 'viewed' },
  });

  return updated!;
}

export async function shortlistQuote(
  customerId: string,
  jobId: string,
  quoteId: string
): Promise<Quote> {
  const { job, quote } = await requireQuoteOnJob(jobId, quoteId);

  if (job.customer_id !== customerId) throw Errors.forbidden('Not your job');
  if (!['pending', 'viewed'].includes(quote.status)) {
    throw Errors.badRequest('Quote must be pending or viewed to shortlist');
  }

  const updated = await jobRepo.updateQuoteStatus(quoteId, 'shortlisted', {
    shortlisted_at: new Date(),
  });

  notify({
    userId: quote.provider_id,
    type: 'quote_shortlisted',
    channel: 'in_app',
    title: 'Your quote was shortlisted',
    body: 'A customer has shortlisted your quote!',
    data: { jobId, quoteId },
  });

  writeLog({
    action: 'quote_updated',
    actorId: customerId,
    targetType: 'quote',
    targetId: quoteId,
    before: { status: quote.status },
    after: { status: 'shortlisted' },
  });

  return updated!;
}

export async function rejectQuote(
  customerId: string,
  jobId: string,
  quoteId: string
): Promise<Quote> {
  const { job, quote } = await requireQuoteOnJob(jobId, quoteId);

  if (job.customer_id !== customerId) throw Errors.forbidden('Not your job');
  if (['awarded', 'rejected', 'withdrawn', 'expired'].includes(quote.status)) {
    throw Errors.badRequest('Quote cannot be rejected in its current state');
  }

  const updated = await jobRepo.updateQuoteStatus(quoteId, 'rejected', { rejected_at: new Date() });

  notify({
    userId: quote.provider_id,
    type: 'quote_rejected',
    channel: 'in_app',
    title: 'Your quote was not selected',
    body: 'The customer has passed on your quote for this job.',
    data: { jobId, quoteId },
  });

  writeLog({
    action: 'quote_rejected',
    actorId: customerId,
    targetType: 'quote',
    targetId: quoteId,
    before: { status: quote.status },
    after: { status: 'rejected' },
  });

  return updated!;
}

// ── Withdraw Quote (Provider) ─────────────────────────────────────────────────

export async function withdrawQuote(
  providerId: string,
  jobId: string,
  quoteId: string
): Promise<Quote> {
  const { job, quote } = await requireQuoteOnJob(jobId, quoteId);

  if (quote.provider_id !== providerId) throw Errors.forbidden('Not your quote');
  if (!['pending', 'viewed', 'shortlisted'].includes(quote.status)) {
    throw Errors.badRequest('Quote cannot be withdrawn in its current state');
  }

  const updated = await jobRepo.updateQuoteStatus(quoteId, 'withdrawn', {
    withdrawn_at: new Date(),
  });

  // If no active quotes remain on a quoting job, revert it back to posted
  if (job.status === 'quoting') {
    const allQuotes = await jobRepo.findQuotesByJob(jobId);
    const activeCount = allQuotes.filter(
      (q) => !['withdrawn', 'rejected', 'expired'].includes(q.status) && q.id !== quoteId
    ).length;
    if (activeCount === 0) {
      await jobRepo.updateJobStatus(jobId, 'posted');
    }
  }

  notify({
    userId: job.customer_id,
    type: 'quote_withdrawn',
    channel: 'in_app',
    title: 'A quote was withdrawn',
    body: 'A provider has withdrawn their quote from your job.',
    data: { jobId, quoteId },
  });

  writeLog({
    action: 'quote_withdrawn',
    actorId: providerId,
    targetType: 'quote',
    targetId: quoteId,
    before: { status: quote.status },
    after: { status: 'withdrawn' },
  });

  return updated!;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireJob(jobId: string): Promise<Job> {
  const job = await jobRepo.findJobById(jobId);
  if (!job) throw Errors.notFound('Job not found');
  return job;
}

async function requireQuoteOnJob(
  jobId: string,
  quoteId: string
): Promise<{ job: Job; quote: Quote }> {
  const job = await requireJob(jobId);
  const quote = await jobRepo.findQuoteById(quoteId);
  if (!quote || quote.job_id !== jobId) throw Errors.notFound('Quote not found on this job');
  return { job, quote };
}

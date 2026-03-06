import { env } from '../config/env';
import { Errors } from '../middleware/errors';
import { notify } from './notification.service';
import { writeLog } from './audit.service';
import { cacheTagForProvider, invalidateTags } from './cache.service';
import * as jobRepo from '../repositories/job.repo';
import * as reviewsRepo from '../repositories/reviews.repo';
import type { Review } from '../repositories/reviews.repo';
import type { CreateReviewInput as SchemaInput } from '../schemas/reviews.schema';

// ── Submit Review ─────────────────────────────────────────────────────────────

export async function submitReview(
  customerId: string,
  jobId: string,
  input: SchemaInput
): Promise<Review> {
  const job = await jobRepo.findJobById(jobId);
  if (!job) throw Errors.notFound('Job');

  if (job.status !== 'completed') {
    throw Errors.badRequest('Job must be completed to review');
  }

  if (job.customer_id !== customerId) {
    throw Errors.forbidden();
  }

  // Review window check
  const completedAt = job.completed_at;
  if (!completedAt) {
    throw Errors.badRequest('Job does not have a completion date');
  }
  const windowMs = env.REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() > completedAt.getTime() + windowMs) {
    throw Errors.badRequest('Review window has closed');
  }

  // Resolve awarded provider
  if (!job.awarded_quote_id) {
    throw Errors.badRequest('Job has no awarded quote');
  }
  const quote = await jobRepo.findQuoteById(job.awarded_quote_id);
  if (!quote) throw Errors.notFound('Awarded quote');

  const revieweeId = quote.provider_id;

  let review: Review;
  try {
    review = await reviewsRepo.createReview({
      job_id:                jobId,
      quote_id:              quote.id,
      reviewer_id:           customerId,
      reviewee_id:           revieweeId,
      rating:                input.rating,
      rating_quality:        input.rating_quality,
      rating_timeliness:     input.rating_timeliness,
      rating_communication:  input.rating_communication,
      rating_value:          input.rating_value,
      body:                  input.body,
    });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === '23505') throw Errors.reviewAlreadyExists();
    throw err;
  }

  // Fire-and-forget notification to provider
  notify({
    userId:  revieweeId,
    type:    'review_received',
    channel: 'in_app',
    title:   'You received a new review',
    body:    `A customer has left you a ${input.rating}/10 review.`,
    data:    { jobId, reviewId: review.id },
  });

  writeLog({
    action:     'review_created',
    actorId:    customerId,
    targetType: 'job',
    targetId:   jobId,
    after:      { reviewId: review.id, rating: input.rating },
  });

  await invalidateTags([cacheTagForProvider(revieweeId), 'provider-directory']);

  return review;
}

// ── Get Reviews for a Job ─────────────────────────────────────────────────────

export async function getJobReviews(jobId: string): Promise<Review[]> {
  return reviewsRepo.findReviewsByJob(jobId);
}

// ── Get Paginated Reviews for a Provider ─────────────────────────────────────

export async function getProviderReviews(
  providerId: string,
  cursor?: string,
  limit?: number
): Promise<{ reviews: Review[]; nextCursor: string | null }> {
  return reviewsRepo.findReviewsByProvider(providerId, cursor, limit);
}

// ── Respond to Review (Provider) ─────────────────────────────────────────────

export async function respondToReview(
  providerId: string,
  reviewId: string,
  response: string
): Promise<Review> {
  const review = await reviewsRepo.findReviewById(reviewId);
  if (!review) throw Errors.notFound('Review');

  if (review.reviewee_id !== providerId) throw Errors.forbidden();

  if (review.provider_response !== null) {
    throw Errors.badRequest('Already responded to this review');
  }

  const updated = await reviewsRepo.setProviderResponse(reviewId, response);
  await invalidateTags([cacheTagForProvider(providerId), 'provider-directory']);
  return updated;
}

// ── Hide Review (Admin) ───────────────────────────────────────────────────────

export async function adminHideReview(reviewId: string): Promise<Review> {
  const review = await reviewsRepo.findReviewById(reviewId);
  if (!review) throw Errors.notFound('Review');

  const updated = await reviewsRepo.hideReview(reviewId);

  writeLog({
    action:     'review_hidden',
    targetType: 'job',
    targetId:   review.job_id,
    after:      { reviewId, is_hidden: true },
  });

  await invalidateTags([cacheTagForProvider(review.reviewee_id), 'provider-directory']);

  return updated;
}

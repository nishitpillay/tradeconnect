import { Router } from 'express';
import * as jobsCtrl from '../controllers/jobs.controller';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRole, requireEmailVerified } from '../middleware/rbac.middleware';
import {
  jobPostDailyLimit,
  jobPostWeeklyLimit,
  quoteSubmitDailyLimit,
  quoteSubmitWeeklyLimit,
} from '../middleware/rateLimit.middleware';
import {
  CreateJobSchema,
  PatchJobSchema,
  CancelJobSchema,
  JobFeedQuerySchema,
  SubmitQuoteSchema,
  QuoteActionSchema,
} from '../schemas/job.schema';

const router = Router();

// All job routes require authentication and an active account
router.use(requireAuth, requireActive);

// ── Customer: Create & manage their own jobs ──────────────────────────────────

router.post(
  '/',
  requireRole('customer'),
  requireEmailVerified,
  jobPostDailyLimit,
  jobPostWeeklyLimit,
  validate(CreateJobSchema),
  jobsCtrl.create
);

router.post(
  '/:id/publish',
  requireRole('customer'),
  jobsCtrl.publish
);

router.patch(
  '/:id',
  requireRole('customer'),
  validate(PatchJobSchema),
  jobsCtrl.patch
);

router.post(
  '/:id/award',
  requireRole('customer'),
  jobsCtrl.award
);

router.post(
  '/:id/complete',
  requireRole('customer'),
  jobsCtrl.complete
);

router.post(
  '/:id/cancel',
  requireRole('customer', 'admin'),
  validate(CancelJobSchema),
  jobsCtrl.cancel
);

// ── Provider: Browse feed & submit quotes ─────────────────────────────────────

// Provider feed — published jobs within provider's service radius
router.get(
  '/feed',
  requireRole('provider'),
  validateQuery(JobFeedQuerySchema),
  jobsCtrl.list
);

router.post(
  '/:id/quotes',
  requireRole('provider'),
  requireEmailVerified,
  quoteSubmitDailyLimit,
  quoteSubmitWeeklyLimit,
  validate(SubmitQuoteSchema),
  jobsCtrl.submitQuote
);

router.post(
  '/:id/accept',
  requireRole('provider'),
  jobsCtrl.accept
);

// ── Customer: Quote actions (view / shortlist / reject) ───────────────────────

router.patch(
  '/:id/quotes/:quoteId',
  requireRole('customer'),
  validate(QuoteActionSchema),
  jobsCtrl.patchQuote
);

// ── Provider: Withdraw quote ───────────────────────────────────────────────────

router.delete(
  '/:id/quotes/:quoteId',
  requireRole('provider'),
  jobsCtrl.withdrawQuote
);

// ── Shared: Job detail & quotes ───────────────────────────────────────────────

// Customers see their own jobs; providers see published jobs
router.get(
  '/:id',
  jobsCtrl.getById
);

// Only job owner + admin can see all quotes
router.get(
  '/:id/quotes',
  jobsCtrl.listQuotes
);

export default router;

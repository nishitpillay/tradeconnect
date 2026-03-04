import { Router } from 'express';
import * as reviewsCtrl from '../controllers/reviews.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { ProviderResponseSchema } from '../schemas/reviews.schema';

const router = Router();

router.use(requireAuth, requireActive);

// Provider responds to a review they received
router.patch(
  '/:id/response',
  requireRole('provider'),
  validate(ProviderResponseSchema),
  reviewsCtrl.respondToReview
);

// Admin soft-deletes (hides) a review
router.delete(
  '/:id',
  requireRole('admin'),
  reviewsCtrl.hideReview
);

export default router;

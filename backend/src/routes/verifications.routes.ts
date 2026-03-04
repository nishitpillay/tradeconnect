import { Router } from 'express';
import * as ctrl from '../controllers/verifications.controller';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  UploadUrlSchema,
  SubmitVerificationSchema,
  ReviewVerificationSchema,
  ListVerificationsQuerySchema,
} from '../schemas/verifications.schema';

const router = Router();

router.use(requireAuth, requireActive);

// Provider: get presigned S3 PUT URL
router.post(
  '/upload-url',
  requireRole('provider'),
  validate(UploadUrlSchema),
  ctrl.getUploadUrl
);

// Provider: submit verification record after upload
router.post(
  '/',
  requireRole('provider'),
  validate(SubmitVerificationSchema),
  ctrl.submitVerification
);

// Provider/Admin: list verifications
router.get(
  '/',
  requireRole('provider', 'admin'),
  validateQuery(ListVerificationsQuerySchema),
  ctrl.listVerifications
);

// Provider/Admin: get single verification
router.get(
  '/:id',
  requireRole('provider', 'admin'),
  ctrl.getVerification
);

// Admin: approve or reject
router.patch(
  '/:id/review',
  requireRole('admin'),
  validate(ReviewVerificationSchema),
  ctrl.reviewVerification
);

export default router;

import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  ListUsersQuerySchema,
  UpdateUserStatusSchema,
  ListJobsAdminQuerySchema,
  ForceJobStatusSchema,
  ListReportsQuerySchema,
  ReviewReportSchema,
  ListAuditLogsQuerySchema,
} from '../schemas/admin.schema';

const router = Router();

// All admin routes require auth + active account + admin role
router.use(requireAuth, requireActive, requireRole('admin'));

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', ctrl.getStats);

// ── Users ─────────────────────────────────────────────────────────────────────

router.get(
  '/users',
  validateQuery(ListUsersQuerySchema),
  ctrl.listUsers
);

router.get('/users/:id', ctrl.getUserById);

router.patch(
  '/users/:id/status',
  validate(UpdateUserStatusSchema),
  ctrl.updateUserStatus
);

// ── Jobs ──────────────────────────────────────────────────────────────────────

router.get(
  '/jobs',
  validateQuery(ListJobsAdminQuerySchema),
  ctrl.listJobs
);

router.patch(
  '/jobs/:id/status',
  validate(ForceJobStatusSchema),
  ctrl.forceJobStatus
);

// ── Reports ───────────────────────────────────────────────────────────────────

router.get(
  '/reports',
  validateQuery(ListReportsQuerySchema),
  ctrl.listReports
);

router.patch(
  '/reports/:id/review',
  validate(ReviewReportSchema),
  ctrl.reviewReport
);

// ── Audit Logs ────────────────────────────────────────────────────────────────

router.get(
  '/audit-logs',
  validateQuery(ListAuditLogsQuerySchema),
  ctrl.listAuditLogs
);

export default router;

/**
 * Admin Schemas (Zod)
 *
 * Validation schemas for all admin dashboard endpoints.
 */

import { z } from 'zod';

// ─── Re-usable enums ──────────────────────────────────────────────────────────

const USER_STATUSES     = ['active', 'suspended', 'banned', 'pending_verification', 'deleted'] as const;
const JOB_STATUSES      = ['draft', 'posted', 'quoting', 'awarded', 'in_progress', 'completed', 'cancelled', 'expired', 'closed', 'disputed'] as const;
const REPORT_STATUSES   = ['pending', 'reviewed', 'actioned', 'dismissed'] as const;
const REPORT_ENTITY_TYPES = ['user', 'job', 'quote', 'message', 'review'] as const;
const REPORT_ACTIONS    = ['dismissed', 'warned', 'content_removed', 'user_suspended', 'user_banned'] as const;
const AUDIT_TARGET_TYPES = ['user', 'job', 'quote', 'message', 'document', 'notification'] as const;

// ─── List Users ───────────────────────────────────────────────────────────────

export const ListUsersQuerySchema = z
  .object({
    role:   z.enum(['customer', 'provider', 'admin']).optional(),
    status: z.enum(USER_STATUSES).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    cursor: z.string().optional(),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

// ─── Update User Status ───────────────────────────────────────────────────────

export const UpdateUserStatusSchema = z
  .object({
    status: z.enum(['active', 'suspended', 'banned', 'deleted']),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict();

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;

// ─── List Jobs (Admin) ────────────────────────────────────────────────────────

export const ListJobsAdminQuerySchema = z
  .object({
    status:      z.enum(JOB_STATUSES).optional(),
    category_id: z.string().uuid().optional(),
    customer_id: z.string().uuid().optional(),
    cursor:      z.string().optional(),
    limit:       z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListJobsAdminQuery = z.infer<typeof ListJobsAdminQuerySchema>;

// ─── Force Job Status ─────────────────────────────────────────────────────────

export const ForceJobStatusSchema = z
  .object({
    status: z.enum(['cancelled', 'closed', 'expired']),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict();

export type ForceJobStatusInput = z.infer<typeof ForceJobStatusSchema>;

// ─── List Reports ─────────────────────────────────────────────────────────────

export const ListReportsQuerySchema = z
  .object({
    status:      z.enum(REPORT_STATUSES).optional(),
    entity_type: z.enum(REPORT_ENTITY_TYPES).optional(),
    cursor:      z.string().optional(),
    limit:       z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;

// ─── Review Report ────────────────────────────────────────────────────────────

export const ReviewReportSchema = z
  .object({
    status:       z.enum(['reviewed', 'actioned', 'dismissed']),
    action_taken: z.enum(REPORT_ACTIONS).optional(),
  })
  .strict();

export type ReviewReportInput = z.infer<typeof ReviewReportSchema>;

// ─── List Audit Logs ──────────────────────────────────────────────────────────

export const ListAuditLogsQuerySchema = z
  .object({
    actor_id:    z.string().uuid().optional(),
    action:      z.string().trim().min(1).max(100).optional(),
    target_type: z.enum(AUDIT_TARGET_TYPES).optional(),
    from:        z.string().datetime({ offset: true }).optional(),
    to:          z.string().datetime({ offset: true }).optional(),
    cursor:      z.coerce.number().int().min(0).optional(),  // BIGSERIAL id offset
    limit:       z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;

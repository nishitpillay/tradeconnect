/**
 * Admin Service
 *
 * Business logic for admin dashboard operations:
 *   - Platform stats
 *   - User management (list, view, status changes)
 *   - Job oversight (list, force status)
 *   - Reports queue (list, review)
 *   - Audit log browsing
 */

import * as adminRepo from '../repositories/admin.repo';
import * as userRepo from '../repositories/user.repo';
import * as jobRepo from '../repositories/job.repo';
import { writeLog } from './audit.service';
import { notify } from './notification.service';
import { Errors, AppError } from '../middleware/errors';
import { cacheTagForProvider, getCacheMetricsSnapshot, invalidateTag, invalidateTags } from './cache.service';
import type {
  ListUsersQuery,
  UpdateUserStatusInput,
  ListJobsAdminQuery,
  ForceJobStatusInput,
  ListReportsQuery,
  ReviewReportInput,
  ListAuditLogsQuery,
} from '../schemas/admin.schema';
import type { JobStatus } from '../repositories/job.repo';

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getStats() {
  return adminRepo.getStats();
}

export async function getCacheMetrics() {
  return getCacheMetricsSnapshot();
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(query: ListUsersQuery) {
  return adminRepo.listUsers(query);
}

export async function getUserById(id: string) {
  const result = await adminRepo.findUserWithProfileById(id);
  if (!result) throw Errors.notFound('User');
  return result;
}

export async function updateUserStatus(
  adminId: string,
  userId: string,
  input: UpdateUserStatusInput
) {
  if (adminId === userId) {
    throw Errors.badRequest('You cannot change your own account status');
  }

  const user = await userRepo.findById(userId);
  if (!user) throw Errors.notFound('User');

  const updated = await adminRepo.adminUpdateUserStatus(userId, input.status);

  // Invalidate tokens when suspending or banning — force re-auth on next request.
  // Redis invalidation (which is what matters) runs first inside invalidateAllTokens.
  // The DB update may fail if the schema differs; we tolerate that non-fatally.
  if (input.status === 'suspended' || input.status === 'banned') {
    try {
      await userRepo.invalidateAllTokens(userId);
    } catch (err) {
      console.warn('[Admin] Token DB invalidation failed (non-fatal):', (err as Error).message);
    }
    notify({
      userId,
      type:    input.status === 'banned' ? 'account_banned' : 'account_suspended',
      channel: 'in_app',
      title:   input.status === 'banned' ? 'Account banned' : 'Account suspended',
      body:    input.reason
        ?? (input.status === 'banned'
          ? 'Your account has been permanently banned.'
          : 'Your account has been suspended.'),
      data: {},
    });
  }

  const auditAction = input.status === 'suspended' ? 'user_suspended'
    : input.status === 'banned'  ? 'user_banned'
    : input.status === 'deleted' ? 'user_deleted'
    : 'user_updated';

  writeLog({
    action:     auditAction,
    actorId:    adminId,
    targetType: 'user',
    targetId:   userId,
    before:     { status: user.status },
    after:      { status: input.status, reason: input.reason },
  });

  await invalidateTags([cacheTagForProvider(userId), 'provider-directory']);

  return updated!;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function listJobs(query: ListJobsAdminQuery) {
  return adminRepo.listJobsAdmin(query);
}

export async function forceJobStatus(
  adminId: string,
  jobId: string,
  input: ForceJobStatusInput
) {
  const job = await jobRepo.findJobById(jobId);
  if (!job) throw Errors.notFound('Job');

  const TERMINAL_STATUSES: JobStatus[] = ['completed', 'cancelled', 'expired', 'closed', 'disputed'];
  if (TERMINAL_STATUSES.includes(job.status)) {
    throw new AppError(
      409,
      'ALREADY_TERMINAL',
      `Job is already in terminal status '${job.status}'`
    );
  }

  const extra: Record<string, unknown> = {};
  if (input.status === 'cancelled') {
    extra.cancelled_at         = new Date();
    extra.cancellation_reason  = input.reason ?? 'Cancelled by admin';
  }

  const updated = await jobRepo.updateJobStatus(jobId, input.status as JobStatus, extra);

  const jobAuditAction = input.status === 'cancelled' ? 'job_cancelled'
    : input.status === 'expired' ? 'job_expired'
    : 'job_closed';

  writeLog({
    action:     jobAuditAction,
    actorId:    adminId,
    targetType: 'job',
    targetId:   jobId,
    before:     { status: job.status },
    after:      { status: input.status, reason: input.reason },
  });

  await invalidateTag('feed-summaries');

  return updated!;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function listReports(query: ListReportsQuery) {
  return adminRepo.listReports(query);
}

export async function reviewReport(
  adminId: string,
  reportId: string,
  input: ReviewReportInput
) {
  const report = await adminRepo.findReportById(reportId);
  if (!report) throw Errors.notFound('Report');

  if (report.status !== 'pending') {
    throw new AppError(409, 'ALREADY_REVIEWED', 'This report has already been reviewed');
  }

  const updated = await adminRepo.updateReport(reportId, {
    status:       input.status,
    reviewed_by:  adminId,
    action_taken: input.action_taken,
  });

  writeLog({
    action:     'report_actioned',
    actorId:    adminId,
    targetType: 'user',
    targetId:   reportId,
    before:     { status: 'pending' },
    after:      { status: input.status, action_taken: input.action_taken },
  });

  return updated!;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export async function listAuditLogs(query: ListAuditLogsQuery) {
  return adminRepo.listAuditLogs(query);
}

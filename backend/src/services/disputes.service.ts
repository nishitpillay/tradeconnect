import { Errors } from '../middleware/errors';
import { notify } from './notification.service';
import { writeLog } from './audit.service';
import * as jobRepo from '../repositories/job.repo';
import * as disputesRepo from '../repositories/disputes.repo';
import type { Dispute, DisputeStatus } from '../repositories/disputes.repo';
import type { RaiseDisputeInput, UpdateDisputeStatusInput, ListDisputesQuery } from '../schemas/disputes.schema';

// ── Raise a Dispute ───────────────────────────────────────────────────────────

export async function raiseDispute(
  actorId: string,
  actorRole: string,
  input: RaiseDisputeInput
): Promise<Dispute> {
  const job = await jobRepo.findJobById(input.job_id);
  if (!job) throw Errors.notFound('Job');

  const allowedStatuses: string[] = ['awarded', 'in_progress', 'completed'];
  if (!allowedStatuses.includes(job.status)) {
    throw Errors.badRequest('Disputes can only be raised on awarded, in_progress, or completed jobs');
  }

  if (!job.awarded_quote_id) {
    throw Errors.badRequest('Job has no awarded quote');
  }

  const quote = await jobRepo.findQuoteById(job.awarded_quote_id);
  if (!quote) throw Errors.notFound('Awarded quote');

  const providerId  = quote.provider_id;
  const customerId  = job.customer_id;

  if (actorRole === 'customer' && actorId !== customerId) {
    throw Errors.forbidden();
  }
  if (actorRole === 'provider' && actorId !== providerId) {
    throw Errors.forbidden();
  }

  const againstUser = actorRole === 'customer' ? providerId : customerId;

  const existing = await disputesRepo.findOpenDisputeByJobAndRaiser(input.job_id, actorId);
  if (existing) {
    throw Errors.badRequest('You already have an active dispute for this job');
  }

  const dispute = await disputesRepo.createDispute({
    job_id:        input.job_id,
    raised_by:     actorId,
    against_user:  againstUser,
    reason:        input.reason,
    evidence_urls: input.evidence_urls,
  });

  notify({
    userId:  againstUser,
    type:    'dispute_opened',
    channel: 'in_app',
    title:   'A dispute has been raised',
    body:    'A dispute has been opened against you for a job.',
    data:    { jobId: input.job_id, disputeId: dispute.id },
  });

  writeLog({
    action:     'dispute_opened',
    actorId,
    targetType: 'job',
    targetId:   input.job_id,
    after:      { disputeId: dispute.id },
  });

  return dispute;
}

// ── List Disputes ─────────────────────────────────────────────────────────────

export async function listDisputes(
  actorId: string,
  actorRole: string,
  query: ListDisputesQuery
): Promise<{ disputes: Dispute[]; nextCursor: string | null }> {
  if (actorRole === 'admin') {
    return disputesRepo.findAllDisputes(query.cursor, query.limit, query.status);
  }
  return disputesRepo.findDisputesByUser(actorId, query.cursor, query.limit, query.status);
}

// ── Get Dispute ───────────────────────────────────────────────────────────────

export async function getDispute(
  actorId: string,
  actorRole: string,
  disputeId: string
): Promise<Dispute> {
  const dispute = await disputesRepo.findDisputeById(disputeId);
  if (!dispute) throw Errors.notFound('Dispute');

  if (actorRole !== 'admin' && dispute.raised_by !== actorId && dispute.against_user !== actorId) {
    throw Errors.forbidden();
  }

  return dispute;
}

// ── Update Dispute Status (Admin) ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  open:          ['investigating'],
  investigating: ['resolved'],
  resolved:      [],
  closed:        [],
};

export async function updateDisputeStatus(
  adminId: string,
  disputeId: string,
  input: UpdateDisputeStatusInput
): Promise<Dispute> {
  const dispute = await disputesRepo.findDisputeById(disputeId);
  if (!dispute) throw Errors.notFound('Dispute');

  const allowed = VALID_TRANSITIONS[dispute.status];
  if (!allowed.includes(input.status as DisputeStatus)) {
    throw Errors.badRequest(
      `Cannot transition from '${dispute.status}' to '${input.status}'`
    );
  }

  const updated = await disputesRepo.updateDisputeStatus(disputeId, {
    status:      input.status as DisputeStatus,
    resolution:  input.status === 'resolved' ? (input as { resolution: 'customer_favour' | 'provider_favour' | 'mutual' | 'no_action' }).resolution : undefined,
    admin_notes: input.admin_notes,
    resolved_by: input.status === 'resolved' ? adminId : undefined,
  });

  if (!updated) throw Errors.notFound('Dispute');

  const auditAction = input.status === 'resolved' ? 'dispute_resolved' : 'dispute_updated';
  writeLog({
    action:     auditAction,
    actorId:    adminId,
    targetType: 'job',
    targetId:   dispute.job_id,
    before:     { status: dispute.status },
    after:      { status: input.status, disputeId },
  });

  if (input.status === 'resolved') {
    notify({
      userId:  dispute.raised_by,
      type:    'dispute_resolved',
      channel: 'in_app',
      title:   'Your dispute has been resolved',
      body:    'An admin has resolved your dispute.',
      data:    { jobId: dispute.job_id, disputeId },
    });
    notify({
      userId:  dispute.against_user,
      type:    'dispute_resolved',
      channel: 'in_app',
      title:   'A dispute has been resolved',
      body:    'An admin has resolved a dispute involving you.',
      data:    { jobId: dispute.job_id, disputeId },
    });
  }

  return updated;
}

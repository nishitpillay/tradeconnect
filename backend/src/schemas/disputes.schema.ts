import { z } from 'zod';

// ─── Raise Dispute ────────────────────────────────────────────────────────────

export const RaiseDisputeSchema = z
  .object({
    job_id:        z.string().uuid(),
    reason:        z.string().trim().min(10).max(2000),
    evidence_urls: z.array(z.string().url()).max(10).default([]),
  })
  .strict();

export type RaiseDisputeInput = z.infer<typeof RaiseDisputeSchema>;

// ─── Update Dispute Status ─────────────────────────────────────────────────────

const disputeResolutionEnum = z.enum(['customer_favour', 'provider_favour', 'mutual', 'no_action']);

export const UpdateDisputeStatusSchema = z.discriminatedUnion('status', [
  z.object({
    status:      z.literal('investigating'),
    admin_notes: z.string().max(5000).optional(),
  }),
  z.object({
    status:      z.literal('resolved'),
    resolution:  disputeResolutionEnum,
    admin_notes: z.string().max(5000).optional(),
  }),
]);

export type UpdateDisputeStatusInput = z.infer<typeof UpdateDisputeStatusSchema>;

// ─── List Disputes Query ──────────────────────────────────────────────────────

const disputeStatusEnum = z.enum(['open', 'investigating', 'resolved', 'closed']);

export const ListDisputesQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit:  z.coerce.number().int().min(1).max(50).default(20),
    status: disputeStatusEnum.optional(),
  })
  .strict();

export type ListDisputesQuery = z.infer<typeof ListDisputesQuerySchema>;

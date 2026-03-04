import { z } from 'zod';

// ─── Submit Review ────────────────────────────────────────────────────────────

export const CreateReviewSchema = z
  .object({
    rating:               z.number().int().min(1).max(10),
    rating_quality:       z.number().int().min(1).max(10).optional(),
    rating_timeliness:    z.number().int().min(1).max(10).optional(),
    rating_communication: z.number().int().min(1).max(10).optional(),
    rating_value:         z.number().int().min(1).max(10).optional(),
    body:                 z.string().trim().min(10).max(2000).optional(),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

// ─── Provider Response ────────────────────────────────────────────────────────

export const ProviderResponseSchema = z
  .object({
    response: z.string().min(1).max(1000),
  })
  .strict();

export type ProviderResponseInput = z.infer<typeof ProviderResponseSchema>;

// ─── Provider Reviews Query ───────────────────────────────────────────────────

export const ProviderReviewsQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit:  z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type ProviderReviewsQuery = z.infer<typeof ProviderReviewsQuerySchema>;

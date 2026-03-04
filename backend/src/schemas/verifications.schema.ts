import { z } from 'zod';

// ── Shared enums ──────────────────────────────────────────────────────────────

export const verificationTypeEnum = z.enum([
  'identity',
  'trade_license',
  'insurance',
  'abn',
]);

export const documentTypeEnum = z.enum([
  'passport',
  'drivers_licence',
  'medicare_card',
  'birth_certificate',
  'license_certificate',
  'insurance_policy',
  'abn_registration',
  'other',
]);

// ── POST /upload-url ──────────────────────────────────────────────────────────

export const UploadUrlSchema = z
  .object({
    verification_type: verificationTypeEnum,
    file_mime: z.string().regex(
      /^(image\/(jpeg|png|webp)|application\/pdf)$/,
      'file_mime must be image/jpeg, image/png, image/webp, or application/pdf'
    ),
  })
  .strict();

export type UploadUrlInput = z.infer<typeof UploadUrlSchema>;

// ── POST / (submit verification) ──────────────────────────────────────────────

export const SubmitVerificationSchema = z
  .object({
    verification_type: verificationTypeEnum,
    document_type:     documentTypeEnum,
    s3_key:            z.string().min(1).max(500),
    expires_at:        z.string().date().optional(),
  })
  .strict();

export type SubmitVerificationInput = z.infer<typeof SubmitVerificationSchema>;

// ── PATCH /:id/review ─────────────────────────────────────────────────────────

export const ReviewVerificationSchema = z.discriminatedUnion('status', [
  z.object({
    status:      z.literal('verified'),
    admin_notes: z.string().max(2000).optional(),
  }).strict(),
  z.object({
    status:           z.literal('rejected'),
    rejection_reason: z.string().min(10).max(1000),
    admin_notes:      z.string().max(2000).optional(),
  }).strict(),
]);

export type ReviewVerificationInput = z.infer<typeof ReviewVerificationSchema>;

// ── GET / (list query params) ─────────────────────────────────────────────────

export const ListVerificationsQuerySchema = z
  .object({
    status:      z.enum(['pending', 'verified', 'rejected', 'unverified']).optional(),
    provider_id: z.string().uuid().optional(),
    cursor:      z.string().optional(),
    limit:       z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListVerificationsQuery = z.infer<typeof ListVerificationsQuerySchema>;

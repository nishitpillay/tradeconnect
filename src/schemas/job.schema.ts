/**
 * Job & Quote Validation Schemas (Zod)
 *
 * All monetary amounts in AUD cents (integer).
 * All AU-specific fields validated (postcode, state, ABN etc.).
 */

import { z } from 'zod';

// ─── Re-usable enums ──────────────────────────────────────────────────────────

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
export const JOB_URGENCY = ['emergency', 'within_48h', 'this_week', 'this_month', 'flexible'] as const;
export const PROPERTY_TYPES = ['house', 'apartment', 'townhouse', 'commercial', 'land', 'other'] as const;
export const QUOTE_TYPES = ['fixed', 'estimate_range', 'hourly', 'call_for_quote'] as const;
export const JOB_SORT = ['recommended', 'newest', 'budget_high', 'budget_low', 'distance'] as const;

// ─── Create / Update Job ──────────────────────────────────────────────────────

// Base object without cross-field refinements — needed so PatchJobSchema can call .omit()
const CreateJobBaseObject = z
  .object({
    category_id:    z.string().uuid('Invalid category ID'),
    subcategory_id: z.string().uuid('Invalid subcategory ID').optional(),

    title: z
      .string()
      .trim()
      .min(5,  'Title must be at least 5 characters')
      .max(200, 'Title must be <= 200 characters'),

    description: z
      .string()
      .trim()
      .min(20,  'Description must be at least 20 characters')
      .max(5000, 'Description must be <= 5000 characters'),

    urgency:       z.enum(JOB_URGENCY).default('flexible'),
    property_type: z.enum(PROPERTY_TYPES).optional(),

    // Location — suburb-level (public)
    suburb:   z.string().trim().min(2).max(100),
    postcode: z
      .string()
      .trim()
      .regex(/^\d{4}$/, 'Postcode must be a 4-digit Australian postcode'),
    state: z.enum(AU_STATES, {
      errorMap: () => ({ message: 'State must be a valid Australian state/territory' }),
    }),

    // Exact address (encrypted at rest; only revealed to awarded provider)
    exact_address: z
      .string()
      .trim()
      .min(5)
      .max(300)
      .optional(),

    // Budget in AUD cents (0 = not set)
    budget_min:    z.number().int().min(100).max(10_000_000).optional(),  // min $1
    budget_max:    z.number().int().min(100).max(10_000_000).optional(),  // max $100k
    budget_is_gst: z.boolean().default(false),

    // Scheduling
    preferred_start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .refine(
        (d) => new Date(d) >= new Date(new Date().toISOString().split('T')[0]),
        { message: 'Preferred start date must be today or in the future' }
      )
      .optional(),
    preferred_end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
    time_window_notes: z.string().trim().max(500).optional(),

    // If true: publish immediately; if false (default): save as draft
    publish: z.boolean().default(false),
  })
  .strict();

export const CreateJobSchema = CreateJobBaseObject
  .refine(
    (data) => {
      if (data.budget_min !== undefined && data.budget_max !== undefined) {
        return data.budget_min <= data.budget_max;
      }
      return true;
    },
    { message: 'budget_min must be <= budget_max', path: ['budget_min'] }
  )
  .refine(
    (data) => {
      if (data.preferred_start_date && data.preferred_end_date) {
        return new Date(data.preferred_start_date) <= new Date(data.preferred_end_date);
      }
      return true;
    },
    { message: 'preferred_start_date must be <= preferred_end_date', path: ['preferred_start_date'] }
  )
  .refine(
    (data) => {
      // If publishing immediately, exact_address is required
      if (data.publish && !data.exact_address) return false;
      return true;
    },
    { message: 'exact_address is required when publishing a job', path: ['exact_address'] }
  );

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

// ─── Patch Job (partial update, draft only) ───────────────────────────────────

export const PatchJobSchema = CreateJobBaseObject
  .omit({ publish: true })
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided' }
  );

export type PatchJobInput = z.infer<typeof PatchJobSchema>;

// ─── Cancel Job ───────────────────────────────────────────────────────────────

export const CancelJobSchema = z
  .object({
    cancellation_reason: z
      .string()
      .trim()
      .min(5)
      .max(500)
      .optional(),
  })
  .strict();

export type CancelJobInput = z.infer<typeof CancelJobSchema>;

// ─── Job Feed Query (provider browse) ────────────────────────────────────────

export const JobFeedQuerySchema = z
  .object({
    category_id: z.string().uuid().optional(),
    state:       z.enum(AU_STATES).optional(),
    postcode:    z.string().regex(/^\d{4}$/).optional(),
    radius_km:   z.coerce.number().int().min(5).max(500).optional(),
    urgency:     z
      .string()
      .optional()
      .transform((val) =>
        val ? (val.split(',').filter((u) => JOB_URGENCY.includes(u as typeof JOB_URGENCY[number])) as typeof JOB_URGENCY[number][]) : undefined
      ),
    budget_min: z.coerce.number().int().min(0).optional(),
    budget_max: z.coerce.number().int().min(0).optional(),
    sort:       z.enum(JOB_SORT).default('recommended'),
    cursor:     z.string().optional(),   // base64-encoded cursor
    limit:      z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type JobFeedQuery = z.infer<typeof JobFeedQuerySchema>;

// ─── Submit Quote ─────────────────────────────────────────────────────────────

export const SubmitQuoteSchema = z
  .object({
    quote_type:      z.enum(QUOTE_TYPES),

    // Fixed price
    price_fixed:     z.number().int().min(100).optional(),   // cents

    // Estimate range
    price_min:       z.number().int().min(100).optional(),
    price_max:       z.number().int().min(100).optional(),

    // Hourly
    hourly_rate:     z.number().int().min(100).optional(),

    is_gst_included: z.boolean().default(false),

    scope_notes:     z
      .string()
      .trim()
      .min(20, 'Scope notes must be at least 20 characters')
      .max(3000)
      .optional(),
    inclusions:      z.string().trim().max(1000).optional(),
    exclusions:      z.string().trim().max(1000).optional(),
    timeline_days:   z.number().int().min(1).max(730).optional(),
    warranty_months: z.number().int().min(0).max(120).optional(),
  })
  .strict()
  .refine(
    (data) => {
      switch (data.quote_type) {
        case 'fixed':          return data.price_fixed !== undefined;
        case 'estimate_range': return data.price_min !== undefined && data.price_max !== undefined;
        case 'hourly':         return data.hourly_rate !== undefined;
        case 'call_for_quote': return true;
      }
    },
    { message: 'Price fields do not match quote_type', path: ['quote_type'] }
  )
  .refine(
    (data) => {
      if (data.price_min !== undefined && data.price_max !== undefined) {
        return data.price_min <= data.price_max;
      }
      return true;
    },
    { message: 'price_min must be <= price_max', path: ['price_min'] }
  );

export type SubmitQuoteInput = z.infer<typeof SubmitQuoteSchema>;

// ─── Withdraw Quote ───────────────────────────────────────────────────────────

export const WithdrawQuoteSchema = z
  .object({
    withdrawal_reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type WithdrawQuoteInput = z.infer<typeof WithdrawQuoteSchema>;

// ─── Quote Action (customer: view / shortlist / reject) ───────────────────────

export const QuoteActionSchema = z
  .object({
    action: z.enum(['viewed', 'shortlisted', 'rejected']),
  })
  .strict();

export type QuoteActionInput = z.infer<typeof QuoteActionSchema>;

// ─── Award Job ────────────────────────────────────────────────────────────────

export const AwardJobSchema = z
  .object({
    quote_id: z.string().uuid('quote_id must be a valid UUID'),
  })
  .strict();

export type AwardJobInput = z.infer<typeof AwardJobSchema>;

// ─── My Jobs Query (customer) ─────────────────────────────────────────────────

export const MyJobsQuerySchema = z
  .object({
    status: z.enum([
      'draft', 'posted', 'quoting', 'awarded', 'in_progress',
      'completed', 'cancelled', 'expired',
    ]).optional(),
    cursor: z.string().optional(),
    limit:  z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type MyJobsQuery = z.infer<typeof MyJobsQuerySchema>;

// ─── Report ───────────────────────────────────────────────────────────────────

export const ReportSchema = z
  .object({
    reason_code: z.enum([
      'spam',
      'offensive',
      'off_platform_contact',
      'misleading',
      'fake_fraudulent',
      'inappropriate_photo',
      'other',
    ]),
    reason_detail: z.string().trim().max(500).optional(),
  })
  .strict();

export type ReportInput = z.infer<typeof ReportSchema>;

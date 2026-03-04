import { z } from 'zod';

export const QUOTE_TYPES = ['fixed', 'estimate_range', 'hourly', 'call_for_quote'] as const;

export const SubmitQuoteSchema = z
  .object({
    quote_type: z.enum(QUOTE_TYPES),
    price_fixed: z.number().int().min(100).optional(),
    price_min: z.number().int().min(100).optional(),
    price_max: z.number().int().min(100).optional(),
    hourly_rate: z.number().int().min(100).optional(),
    is_gst_included: z.boolean().default(false),
    scope_notes: z.string().trim().min(20, 'Scope notes must be at least 20 characters').max(3000).optional(),
    inclusions: z.string().trim().max(1000).optional(),
    exclusions: z.string().trim().max(1000).optional(),
    timeline_days: z.number().int().min(1).max(730).optional(),
    warranty_months: z.number().int().min(0).max(120).optional(),
  })
  .strict()
  .refine((data) => {
    switch (data.quote_type) {
      case 'fixed':
        return data.price_fixed !== undefined;
      case 'estimate_range':
        return data.price_min !== undefined && data.price_max !== undefined;
      case 'hourly':
        return data.hourly_rate !== undefined;
      case 'call_for_quote':
        return true;
    }
  }, { message: 'Price fields do not match quote_type', path: ['quote_type'] })
  .refine((data) => {
    if (data.price_min !== undefined && data.price_max !== undefined) {
      return data.price_min <= data.price_max;
    }
    return true;
  }, { message: 'price_min must be <= price_max', path: ['price_min'] });

export type SubmitQuoteInput = z.infer<typeof SubmitQuoteSchema>;

export const WithdrawQuoteSchema = z
  .object({
    withdrawal_reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type WithdrawQuoteInput = z.infer<typeof WithdrawQuoteSchema>;

export const QuoteActionSchema = z
  .object({
    action: z.enum(['viewed', 'shortlisted', 'rejected']),
  })
  .strict();

export type QuoteActionInput = z.infer<typeof QuoteActionSchema>;

export const AwardJobSchema = z
  .object({
    quote_id: z.string().uuid('quote_id must be a valid UUID'),
  })
  .strict();

export type AwardJobInput = z.infer<typeof AwardJobSchema>;

import { z } from 'zod';

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
export const JOB_URGENCY = ['emergency', 'within_48h', 'this_week', 'this_month', 'flexible'] as const;
export const PROPERTY_TYPES = ['house', 'apartment', 'townhouse', 'commercial', 'land', 'other'] as const;
export const JOB_SORT = ['recommended', 'newest', 'budget_high', 'budget_low', 'distance'] as const;

const CreateJobBaseObject = z
  .object({
    category_id: z.string().uuid('Invalid category ID'),
    subcategory_id: z.string().uuid('Invalid subcategory ID').optional(),
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200, 'Title must be <= 200 characters'),
    description: z
      .string()
      .trim()
      .min(20, 'Description must be at least 20 characters')
      .max(5000, 'Description must be <= 5000 characters'),
    urgency: z.enum(JOB_URGENCY).default('flexible'),
    property_type: z.enum(PROPERTY_TYPES).optional(),
    suburb: z.string().trim().min(2).max(100),
    postcode: z.string().trim().regex(/^\d{4}$/, 'Postcode must be a 4-digit Australian postcode'),
    state: z.enum(AU_STATES, {
      errorMap: () => ({ message: 'State must be a valid Australian state/territory' }),
    }),
    exact_address: z.string().trim().min(5).max(300).optional(),
    budget_min: z.number().int().min(100).max(10_000_000).optional(),
    budget_max: z.number().int().min(100).max(10_000_000).optional(),
    budget_is_gst: z.boolean().default(false),
    preferred_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    preferred_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    time_window_notes: z.string().trim().max(500).optional(),
    publish: z.boolean().default(false),
  })
  .strict();

export const CreateJobSchema = CreateJobBaseObject
  .refine((data) => {
    if (data.budget_min !== undefined && data.budget_max !== undefined) {
      return data.budget_min <= data.budget_max;
    }
    return true;
  }, { message: 'budget_min must be <= budget_max', path: ['budget_min'] })
  .refine((data) => {
    if (data.preferred_start_date && data.preferred_end_date) {
      return new Date(data.preferred_start_date) <= new Date(data.preferred_end_date);
    }
    return true;
  }, { message: 'preferred_start_date must be <= preferred_end_date', path: ['preferred_start_date'] })
  .refine((data) => {
    if (data.publish && !data.exact_address) {
      return false;
    }
    return true;
  }, { message: 'exact_address is required when publishing a job', path: ['exact_address'] });

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const PatchJobSchema = CreateJobBaseObject
  .omit({ publish: true })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type PatchJobInput = z.infer<typeof PatchJobSchema>;

export const CancelJobSchema = z
  .object({
    cancellation_reason: z.string().trim().min(5).max(500).optional(),
  })
  .strict();

export type CancelJobInput = z.infer<typeof CancelJobSchema>;

export const JobFeedQuerySchema = z
  .object({
    category_id: z.string().uuid().optional(),
    state: z.enum(AU_STATES).optional(),
    postcode: z.string().regex(/^\d{4}$/).optional(),
    radius_km: z.coerce.number().int().min(5).max(500).optional(),
    urgency: z
      .string()
      .optional()
      .transform((value) =>
        value
          ? (value.split(',').filter((urgency) => JOB_URGENCY.includes(urgency as (typeof JOB_URGENCY)[number])) as (typeof JOB_URGENCY)[number][])
          : undefined
      ),
    budget_min: z.coerce.number().int().min(0).optional(),
    budget_max: z.coerce.number().int().min(0).optional(),
    sort: z.enum(JOB_SORT).default('recommended'),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type JobFeedQuery = z.infer<typeof JobFeedQuerySchema>;

export const MyJobsQuerySchema = z
  .object({
    status: z.enum(['draft', 'posted', 'quoting', 'awarded', 'in_progress', 'completed', 'cancelled', 'expired']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type MyJobsQuery = z.infer<typeof MyJobsQuerySchema>;

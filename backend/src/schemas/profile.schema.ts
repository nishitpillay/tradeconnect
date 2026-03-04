import { z } from 'zod';
import { AU_STATES } from './job.schema';

// ─── User fields (shared across all roles) ────────────────────────────────────

export const UpdateUserSchema = z
  .object({
    full_name:    z
      .string()
      .trim()
      .min(2,  'Full name must be at least 2 characters')
      .max(100, 'Full name must be <= 100 characters')
      .regex(/^[a-zA-Z\s'\-.]+$/, 'Full name contains invalid characters')
      .optional(),
    display_name: z.string().trim().min(1).max(50).optional(),
    timezone:     z.string().trim().max(60).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ─── Provider profile ─────────────────────────────────────────────────────────

export const UpdateProviderSchema = z
  .object({
    bio:               z.string().trim().max(2000).optional(),
    years_experience:  z.number().int().min(0).max(50).optional(),
    service_radius_km: z.number().int().min(5).max(500).optional(),
    business_name:     z.string().trim().min(2).max(200).optional(),
    abn:               z
      .string()
      .trim()
      .regex(/^\d{11}$/, 'ABN must be exactly 11 digits (no spaces or hyphens)')
      .optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export type UpdateProviderInput = z.infer<typeof UpdateProviderSchema>;

// ─── Customer profile ─────────────────────────────────────────────────────────

export const UpdateCustomerSchema = z
  .object({
    suburb:   z.string().trim().min(2).max(100).optional(),
    state:    z.enum(AU_STATES).optional(),
    postcode: z
      .string()
      .trim()
      .regex(/^\d{4}$/, 'Postcode must be a 4-digit Australian postcode')
      .optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

// ─── Availability toggle ──────────────────────────────────────────────────────

export const ToggleAvailabilitySchema = z
  .object({
    available: z.boolean(),
  })
  .strict();

export type ToggleAvailabilityInput = z.infer<typeof ToggleAvailabilitySchema>;

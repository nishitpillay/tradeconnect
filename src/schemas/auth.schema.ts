/**
 * Auth Validation Schemas (Zod)
 *
 * Used by validate.middleware.ts to validate request body/query/params
 * before reaching the controller. All schemas are strict (no extra keys).
 *
 * AU-specific validations:
 *   - Phone: E.164 format, +61 prefix, Australian mobile/landline pattern
 *   - Password: min 8 chars, 1 uppercase, 1 digit, 1 special character
 */

import { z } from 'zod';

// ─── Re-usable field validators ───────────────────────────────────────────────

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Must be a valid email address')
  .max(254, 'Email must be <= 254 characters');

const passwordField = z
  .string()
  .min(8,  'Password must be at least 8 characters')
  .max(128, 'Password must be <= 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// AU mobile: 04XX XXX XXX → +61 4XX XXX XXX
// AU landlines: 02, 03, 07, 08 followed by 8 digits → +61 X XXXX XXXX
const phoneField = z
  .string()
  .trim()
  .regex(
    /^\+61[2-9]\d{8}$/,
    'Phone must be in Australian E.164 format: +61XXXXXXXXX'
  )
  .optional();

const fullNameField = z
  .string()
  .trim()
  .min(2,  'Full name must be at least 2 characters')
  .max(100, 'Full name must be <= 100 characters')
  .regex(/^[a-zA-Z\s'\-\.]+$/, 'Full name contains invalid characters');

// ─── Register ─────────────────────────────────────────────────────────────────

export const RegisterSchema = z
  .object({
    email:             emailField,
    password:          passwordField,
    full_name:         fullNameField,
    role:              z.enum(['customer', 'provider'], {
                         errorMap: () => ({ message: 'Role must be customer or provider' }),
                       }),
    phone:             phoneField,
    business_name:     z.string().trim().min(2).max(200).optional(),
    terms_accepted:    z.literal(true, {
                         errorMap: () => ({ message: 'You must accept the Terms of Service' }),
                       }),
    privacy_accepted:  z.literal(true, {
                         errorMap: () => ({ message: 'You must accept the Privacy Policy' }),
                       }),
    marketing_consent: z.boolean().default(false),
    referral_code:     z.string().trim().toUpperCase().max(20).optional(),
  })
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ─── Login ────────────────────────────────────────────────────────────────────

export const LoginSchema = z
  .object({
    email:    emailField,
    password: z.string().min(1, 'Password is required').max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;

// ─── Refresh token ────────────────────────────────────────────────────────────

export const RefreshTokenSchema = z
  .object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  })
  .strict();

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

// ─── Email verification ───────────────────────────────────────────────────────

export const VerifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Verification token is required'),
  })
  .strict();

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

// ─── Phone OTP ────────────────────────────────────────────────────────────────

export const RequestPhoneOTPSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .regex(
        /^\+61[2-9]\d{8}$/,
        'Phone must be in Australian E.164 format: +61XXXXXXXXX'
      ),
  })
  .strict();

export type RequestPhoneOTPInput = z.infer<typeof RequestPhoneOTPSchema>;

export const VerifyPhoneOTPSchema = z
  .object({
    phone: z.string().regex(/^\+61[2-9]\d{8}$/),
    otp:   z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must be numeric'),
  })
  .strict();

export type VerifyPhoneOTPInput = z.infer<typeof VerifyPhoneOTPSchema>;

// ─── Password reset ───────────────────────────────────────────────────────────

export const ForgotPasswordSchema = z
  .object({
    email: emailField,
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token:        z.string().min(1, 'Reset token is required'),
    new_password: passwordField,
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// ─── Update notification preferences ─────────────────────────────────────────

export const UpdateNotificationPrefsSchema = z
  .object({
    push_enabled:        z.boolean().optional(),
    email_notifications: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one preference must be provided' }
  );

export type UpdateNotificationPrefsInput = z.infer<typeof UpdateNotificationPrefsSchema>;

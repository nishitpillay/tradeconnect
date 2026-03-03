"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateNotificationPrefsSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.VerifyPhoneOTPSchema = exports.RequestPhoneOTPSchema = exports.VerifyEmailSchema = exports.RefreshTokenSchema = exports.LoginSchema = exports.RegisterSchema = void 0;
const zod_1 = require("zod");
const emailField = zod_1.z
    .string()
    .trim()
    .toLowerCase()
    .email('Must be a valid email address')
    .max(254, 'Email must be <= 254 characters');
const passwordField = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be <= 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
const phoneField = zod_1.z
    .string()
    .trim()
    .regex(/^\+61[2-9]\d{8}$/, 'Phone must be in Australian E.164 format: +61XXXXXXXXX')
    .optional();
const fullNameField = zod_1.z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be <= 100 characters')
    .regex(/^[a-zA-Z\s'\-\.]+$/, 'Full name contains invalid characters');
exports.RegisterSchema = zod_1.z
    .object({
    email: emailField,
    password: passwordField,
    full_name: fullNameField,
    role: zod_1.z.enum(['customer', 'provider'], {
        errorMap: () => ({ message: 'Role must be customer or provider' }),
    }),
    phone: phoneField,
    business_name: zod_1.z.string().trim().min(2).max(200).optional(),
    terms_accepted: zod_1.z.literal(true, {
        errorMap: () => ({ message: 'You must accept the Terms of Service' }),
    }),
    privacy_accepted: zod_1.z.literal(true, {
        errorMap: () => ({ message: 'You must accept the Privacy Policy' }),
    }),
    marketing_consent: zod_1.z.boolean().default(false),
    referral_code: zod_1.z.string().trim().toUpperCase().max(20).optional(),
})
    .strict();
exports.LoginSchema = zod_1.z
    .object({
    email: emailField,
    password: zod_1.z.string().min(1, 'Password is required').max(128),
})
    .strict();
exports.RefreshTokenSchema = zod_1.z
    .object({
    refresh_token: zod_1.z.string().min(1, 'Refresh token is required'),
})
    .strict();
exports.VerifyEmailSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1, 'Verification token is required'),
})
    .strict();
exports.RequestPhoneOTPSchema = zod_1.z
    .object({
    phone: zod_1.z
        .string()
        .trim()
        .regex(/^\+61[2-9]\d{8}$/, 'Phone must be in Australian E.164 format: +61XXXXXXXXX'),
})
    .strict();
exports.VerifyPhoneOTPSchema = zod_1.z
    .object({
    phone: zod_1.z.string().regex(/^\+61[2-9]\d{8}$/),
    otp: zod_1.z
        .string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must be numeric'),
})
    .strict();
exports.ForgotPasswordSchema = zod_1.z
    .object({
    email: emailField,
})
    .strict();
exports.ResetPasswordSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    new_password: passwordField,
})
    .strict();
exports.UpdateNotificationPrefsSchema = zod_1.z
    .object({
    push_enabled: zod_1.z.boolean().optional(),
    email_notifications: zod_1.z.boolean().optional(),
})
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one preference must be provided',
});

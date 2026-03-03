import { z } from 'zod';
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    full_name: z.ZodString;
    role: z.ZodEnum<["customer", "provider"]>;
    phone: z.ZodOptional<z.ZodString>;
    business_name: z.ZodOptional<z.ZodString>;
    terms_accepted: z.ZodLiteral<true>;
    privacy_accepted: z.ZodLiteral<true>;
    marketing_consent: z.ZodDefault<z.ZodBoolean>;
    referral_code: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    email: string;
    password: string;
    full_name: string;
    role: "customer" | "provider";
    terms_accepted: true;
    privacy_accepted: true;
    marketing_consent: boolean;
    phone?: string | undefined;
    business_name?: string | undefined;
    referral_code?: string | undefined;
}, {
    email: string;
    password: string;
    full_name: string;
    role: "customer" | "provider";
    terms_accepted: true;
    privacy_accepted: true;
    phone?: string | undefined;
    business_name?: string | undefined;
    marketing_consent?: boolean | undefined;
    referral_code?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strict", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const RefreshTokenSchema: z.ZodObject<{
    refresh_token: z.ZodString;
}, "strict", z.ZodTypeAny, {
    refresh_token: string;
}, {
    refresh_token: string;
}>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export declare const VerifyEmailSchema: z.ZodObject<{
    token: z.ZodString;
}, "strict", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export declare const RequestPhoneOTPSchema: z.ZodObject<{
    phone: z.ZodString;
}, "strict", z.ZodTypeAny, {
    phone: string;
}, {
    phone: string;
}>;
export type RequestPhoneOTPInput = z.infer<typeof RequestPhoneOTPSchema>;
export declare const VerifyPhoneOTPSchema: z.ZodObject<{
    phone: z.ZodString;
    otp: z.ZodString;
}, "strict", z.ZodTypeAny, {
    phone: string;
    otp: string;
}, {
    phone: string;
    otp: string;
}>;
export type VerifyPhoneOTPInput = z.infer<typeof VerifyPhoneOTPSchema>;
export declare const ForgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strict", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export declare const ResetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    new_password: z.ZodString;
}, "strict", z.ZodTypeAny, {
    token: string;
    new_password: string;
}, {
    token: string;
    new_password: string;
}>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export declare const UpdateNotificationPrefsSchema: z.ZodEffects<z.ZodObject<{
    push_enabled: z.ZodOptional<z.ZodBoolean>;
    email_notifications: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    push_enabled?: boolean | undefined;
    email_notifications?: boolean | undefined;
}, {
    push_enabled?: boolean | undefined;
    email_notifications?: boolean | undefined;
}>, {
    push_enabled?: boolean | undefined;
    email_notifications?: boolean | undefined;
}, {
    push_enabled?: boolean | undefined;
    email_notifications?: boolean | undefined;
}>;
export type UpdateNotificationPrefsInput = z.infer<typeof UpdateNotificationPrefsSchema>;
//# sourceMappingURL=auth.schema.d.ts.map
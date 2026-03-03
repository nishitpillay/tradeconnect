import { z } from 'zod';
export declare const QUOTE_TYPES: readonly ["fixed", "estimate_range", "hourly", "call_for_quote"];
export declare const SubmitQuoteSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    quote_type: z.ZodEnum<["fixed", "estimate_range", "hourly", "call_for_quote"]>;
    price_fixed: z.ZodOptional<z.ZodNumber>;
    price_min: z.ZodOptional<z.ZodNumber>;
    price_max: z.ZodOptional<z.ZodNumber>;
    hourly_rate: z.ZodOptional<z.ZodNumber>;
    is_gst_included: z.ZodDefault<z.ZodBoolean>;
    scope_notes: z.ZodOptional<z.ZodString>;
    inclusions: z.ZodOptional<z.ZodString>;
    exclusions: z.ZodOptional<z.ZodString>;
    timeline_days: z.ZodOptional<z.ZodNumber>;
    warranty_months: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    quote_type: "fixed" | "estimate_range" | "hourly" | "call_for_quote";
    is_gst_included: boolean;
    price_fixed?: number | undefined;
    price_min?: number | undefined;
    price_max?: number | undefined;
    hourly_rate?: number | undefined;
    scope_notes?: string | undefined;
    inclusions?: string | undefined;
    exclusions?: string | undefined;
    timeline_days?: number | undefined;
    warranty_months?: number | undefined;
}, {
    quote_type: "fixed" | "estimate_range" | "hourly" | "call_for_quote";
    price_fixed?: number | undefined;
    price_min?: number | undefined;
    price_max?: number | undefined;
    hourly_rate?: number | undefined;
    is_gst_included?: boolean | undefined;
    scope_notes?: string | undefined;
    inclusions?: string | undefined;
    exclusions?: string | undefined;
    timeline_days?: number | undefined;
    warranty_months?: number | undefined;
}>, {
    quote_type: "fixed" | "estimate_range" | "hourly" | "call_for_quote";
    is_gst_included: boolean;
    price_fixed?: number | undefined;
    price_min?: number | undefined;
    price_max?: number | undefined;
    hourly_rate?: number | undefined;
    scope_notes?: string | undefined;
    inclusions?: string | undefined;
    exclusions?: string | undefined;
    timeline_days?: number | undefined;
    warranty_months?: number | undefined;
}, {
    quote_type: "fixed" | "estimate_range" | "hourly" | "call_for_quote";
    price_fixed?: number | undefined;
    price_min?: number | undefined;
    price_max?: number | undefined;
    hourly_rate?: number | undefined;
    is_gst_included?: boolean | undefined;
    scope_notes?: string | undefined;
    inclusions?: string | undefined;
    exclusions?: string | undefined;
    timeline_days?: number | undefined;
    warranty_months?: number | undefined;
}>, {
    quote_type: "fixed" | "estimate_range" | "hourly" | "call_for_quote";
    is_gst_included: boolean;
    price_fixed?: number | undefined;
    price_min?: number | undefined;
    price_max?: number | undefined;
    hourly_rate?: number | undefined;
    scope_notes?: string | undefined;
    inclusions?: string | undefined;
    exclusions?: string | undefined;
    timeline_days?: number | undefined;
    warranty_months?: number | undefined;
}, {
    quote_type: "fixed" | "estimate_range" | "hourly" | "call_for_quote";
    price_fixed?: number | undefined;
    price_min?: number | undefined;
    price_max?: number | undefined;
    hourly_rate?: number | undefined;
    is_gst_included?: boolean | undefined;
    scope_notes?: string | undefined;
    inclusions?: string | undefined;
    exclusions?: string | undefined;
    timeline_days?: number | undefined;
    warranty_months?: number | undefined;
}>;
export type SubmitQuoteInput = z.infer<typeof SubmitQuoteSchema>;
export declare const WithdrawQuoteSchema: z.ZodObject<{
    withdrawal_reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    withdrawal_reason?: string | undefined;
}, {
    withdrawal_reason?: string | undefined;
}>;
export type WithdrawQuoteInput = z.infer<typeof WithdrawQuoteSchema>;
export declare const QuoteActionSchema: z.ZodObject<{
    action: z.ZodEnum<["viewed", "shortlisted", "rejected"]>;
}, "strict", z.ZodTypeAny, {
    action: "viewed" | "shortlisted" | "rejected";
}, {
    action: "viewed" | "shortlisted" | "rejected";
}>;
export type QuoteActionInput = z.infer<typeof QuoteActionSchema>;
export declare const AwardJobSchema: z.ZodObject<{
    quote_id: z.ZodString;
}, "strict", z.ZodTypeAny, {
    quote_id: string;
}, {
    quote_id: string;
}>;
export type AwardJobInput = z.infer<typeof AwardJobSchema>;
//# sourceMappingURL=quote.schema.d.ts.map
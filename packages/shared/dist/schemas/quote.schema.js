"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardJobSchema = exports.QuoteActionSchema = exports.WithdrawQuoteSchema = exports.SubmitQuoteSchema = exports.QUOTE_TYPES = void 0;
const zod_1 = require("zod");
exports.QUOTE_TYPES = ['fixed', 'estimate_range', 'hourly', 'call_for_quote'];
exports.SubmitQuoteSchema = zod_1.z
    .object({
    quote_type: zod_1.z.enum(exports.QUOTE_TYPES),
    price_fixed: zod_1.z.number().int().min(100).optional(),
    price_min: zod_1.z.number().int().min(100).optional(),
    price_max: zod_1.z.number().int().min(100).optional(),
    hourly_rate: zod_1.z.number().int().min(100).optional(),
    is_gst_included: zod_1.z.boolean().default(false),
    scope_notes: zod_1.z.string().trim().min(20, 'Scope notes must be at least 20 characters').max(3000).optional(),
    inclusions: zod_1.z.string().trim().max(1000).optional(),
    exclusions: zod_1.z.string().trim().max(1000).optional(),
    timeline_days: zod_1.z.number().int().min(1).max(730).optional(),
    warranty_months: zod_1.z.number().int().min(0).max(120).optional(),
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
exports.WithdrawQuoteSchema = zod_1.z
    .object({
    withdrawal_reason: zod_1.z.string().trim().max(500).optional(),
})
    .strict();
exports.QuoteActionSchema = zod_1.z
    .object({
    action: zod_1.z.enum(['viewed', 'shortlisted', 'rejected']),
})
    .strict();
exports.AwardJobSchema = zod_1.z
    .object({
    quote_id: zod_1.z.string().uuid('quote_id must be a valid UUID'),
})
    .strict();

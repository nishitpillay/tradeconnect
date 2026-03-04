"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyJobsQuerySchema = exports.JobFeedQuerySchema = exports.CancelJobSchema = exports.PatchJobSchema = exports.CreateJobSchema = exports.JOB_SORT = exports.PROPERTY_TYPES = exports.JOB_URGENCY = exports.AU_STATES = void 0;
const zod_1 = require("zod");
exports.AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
exports.JOB_URGENCY = ['emergency', 'within_48h', 'this_week', 'this_month', 'flexible'];
exports.PROPERTY_TYPES = ['house', 'apartment', 'townhouse', 'commercial', 'land', 'other'];
exports.JOB_SORT = ['recommended', 'newest', 'budget_high', 'budget_low', 'distance'];
const CreateJobBaseObject = zod_1.z
    .object({
    category_id: zod_1.z.string().uuid('Invalid category ID'),
    subcategory_id: zod_1.z.string().uuid('Invalid subcategory ID').optional(),
    title: zod_1.z.string().trim().min(5, 'Title must be at least 5 characters').max(200, 'Title must be <= 200 characters'),
    description: zod_1.z
        .string()
        .trim()
        .min(20, 'Description must be at least 20 characters')
        .max(5000, 'Description must be <= 5000 characters'),
    urgency: zod_1.z.enum(exports.JOB_URGENCY).default('flexible'),
    property_type: zod_1.z.enum(exports.PROPERTY_TYPES).optional(),
    suburb: zod_1.z.string().trim().min(2).max(100),
    postcode: zod_1.z.string().trim().regex(/^\d{4}$/, 'Postcode must be a 4-digit Australian postcode'),
    state: zod_1.z.enum(exports.AU_STATES, {
        errorMap: () => ({ message: 'State must be a valid Australian state/territory' }),
    }),
    exact_address: zod_1.z.string().trim().min(5).max(300).optional(),
    budget_min: zod_1.z.number().int().min(100).max(10000000).optional(),
    budget_max: zod_1.z.number().int().min(100).max(10000000).optional(),
    budget_is_gst: zod_1.z.boolean().default(false),
    preferred_start_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    preferred_end_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    time_window_notes: zod_1.z.string().trim().max(500).optional(),
    publish: zod_1.z.boolean().default(false),
})
    .strict();
exports.CreateJobSchema = CreateJobBaseObject
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
exports.PatchJobSchema = CreateJobBaseObject
    .omit({ publish: true })
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});
exports.CancelJobSchema = zod_1.z
    .object({
    cancellation_reason: zod_1.z.string().trim().min(5).max(500).optional(),
})
    .strict();
exports.JobFeedQuerySchema = zod_1.z
    .object({
    category_id: zod_1.z.string().uuid().optional(),
    state: zod_1.z.enum(exports.AU_STATES).optional(),
    postcode: zod_1.z.string().regex(/^\d{4}$/).optional(),
    radius_km: zod_1.z.coerce.number().int().min(5).max(500).optional(),
    urgency: zod_1.z
        .string()
        .optional()
        .transform((value) => value
        ? value.split(',').filter((urgency) => exports.JOB_URGENCY.includes(urgency))
        : undefined),
    budget_min: zod_1.z.coerce.number().int().min(0).optional(),
    budget_max: zod_1.z.coerce.number().int().min(0).optional(),
    sort: zod_1.z.enum(exports.JOB_SORT).default('recommended'),
    cursor: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
})
    .strict();
exports.MyJobsQuerySchema = zod_1.z
    .object({
    status: zod_1.z.enum(['draft', 'posted', 'quoting', 'awarded', 'in_progress', 'completed', 'cancelled', 'expired']).optional(),
    cursor: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
})
    .strict();

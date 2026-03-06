import { z } from 'zod';

export const ApiUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['customer', 'provider', 'admin']),
  status: z.string(),
  full_name: z.string(),
  email_verified: z.boolean(),
  phone_verified: z.boolean(),
  created_at: z.union([z.string().datetime(), z.date()]),
});

export const AuthSessionResponseSchema = z.object({
  user: ApiUserSchema,
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  csrf_token: z.string().min(1),
});

export const AuthRefreshResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  csrf_token: z.string().min(1),
});

export const JobItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
}).passthrough();

export const JobsListResponseSchema = z.object({
  jobs: z.array(JobItemSchema),
  nextCursor: z.string().optional(),
});

export const MessageItemSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  sender_id: z.string(),
  message_type: z.string(),
  body: z.string().nullable(),
  created_at: z.union([z.string().datetime(), z.date()]),
}).passthrough();

export const MessagesListResponseSchema = z.object({
  messages: z.array(MessageItemSchema),
});

export const ErrorResponseSchema = z.object({
  message: z.string(),
});

export const ValidationErrorResponseSchema = z.object({
  error: z.object({
    code: z.literal('VALIDATION_ERROR'),
    message: z.string(),
    details: z.object({
      fields: z.array(
        z.object({
          path: z.string(),
          message: z.string(),
        })
      ),
    }),
  }),
});


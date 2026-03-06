import { z } from 'zod';

export const CreateConversationSchema = z.object({
  job_id:      z.string().uuid(),
  customer_id: z.string().uuid(),
}).strict();

export const OpenAdminSupportConversationSchema = z.object({}).strict();

const SendTextMessageSchema = z.object({
  message_type: z.literal('text').optional(),
  body: z.string().trim().min(1).max(5000),
  attachment_url: z.undefined().optional(),
  attachment_mime: z.undefined().optional(),
}).strict();

const SendVoiceMessageSchema = z.object({
  message_type: z.literal('voice'),
  body: z.string().trim().max(5000).optional(),
  attachment_url: z.string().url(),
  attachment_mime: z.string().regex(/^audio\//i, 'attachment_mime must be an audio mime type'),
}).strict();

export const SendMessageSchema = z.union([SendTextMessageSchema, SendVoiceMessageSchema]);

export const ListMessagesQuerySchema = z.object({
  before: z.string().uuid().optional(),
  limit:  z.coerce.number().int().min(1).max(50).default(30),
}).strict();

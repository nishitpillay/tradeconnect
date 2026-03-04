import { z } from 'zod';

export const CreateConversationSchema = z.object({
  job_id:      z.string().uuid(),
  customer_id: z.string().uuid(),
}).strict();

export const SendMessageSchema = z.object({
  body: z.string().min(1).max(5000),
}).strict();

export const ListMessagesQuerySchema = z.object({
  before: z.string().uuid().optional(),
  limit:  z.coerce.number().int().min(1).max(50).default(30),
}).strict();

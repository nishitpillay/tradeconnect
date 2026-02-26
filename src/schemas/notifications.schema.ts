import { z } from 'zod';

export const ListNotificationsQuerySchema = z
  .object({
    cursor:  z.string().optional(),
    limit:   z.coerce.number().int().min(1).max(50).default(20),
    is_read: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  })
  .strict();

export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>;

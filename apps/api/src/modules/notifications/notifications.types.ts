import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});

export const notificationIdParamSchema = z.object({ notificationId: z.string().cuid() });

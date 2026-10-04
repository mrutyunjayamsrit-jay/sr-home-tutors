import { z } from "zod";

export const createTaskSchema = z.object({
  branchId: z.string().cuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  branchId: z.string().cuid().optional(),
  status: z.enum(["PENDING", "COMPLETED"]).optional(),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const taskIdParamSchema = z.object({ taskId: z.string().cuid() });

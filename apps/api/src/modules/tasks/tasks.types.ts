import { z } from "zod";

export const createTaskSchema = z.object({
  // Required for Super Admin (which branch this is assigned to); ignored
  // for a Branch Admin, who can only ever raise a task for their own
  // branch — see tasks.service.ts create.
  branchId: z.string().cuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  // Defaults to today in the service if not given — see tasks.service.ts create.
  assignedDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  branchId: z.string().cuid().optional(),
  status: z.enum(["PENDING", "COMPLETED"]).optional(),
  direction: z.enum(["TO_BRANCH", "TO_SUPER_ADMIN"]).optional(),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const taskIdParamSchema = z.object({ taskId: z.string().cuid() });

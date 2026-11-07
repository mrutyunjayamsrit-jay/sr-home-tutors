import { z } from "zod";

export const createExpenseSchema = z.object({
  branchId: z.string().cuid().optional(),
  category: z.string().min(1).max(60),
  description: z.string().min(1).max(500),
  amount: z.coerce.number().positive(),
  expenseDate: z.coerce.date(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().cuid().optional(),
  category: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  // Super Admin's own sign-off (see expenses.service.ts approve) — not
  // meaningful to a Branch Admin, who never sees this filter in the UI.
  approvalStatus: z.enum(["APPROVED", "PENDING"]).optional(),
});

export const expenseIdParamSchema = z.object({ expenseId: z.string().cuid() });

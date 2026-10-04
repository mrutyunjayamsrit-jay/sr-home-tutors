import { z } from "zod";

export const createParentQuerySchema = z.object({
  target: z.enum(["BRANCH", "SUPER_ADMIN"]),
  subject: z.string().min(2).max(150),
  message: z.string().min(1).max(2000),
});
export type CreateParentQueryInput = z.infer<typeof createParentQuerySchema>;

export const answerParentQuerySchema = z.object({
  answer: z.string().min(1).max(4000),
});
export type AnswerParentQueryInput = z.infer<typeof answerParentQuerySchema>;

export const listParentQueriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  branchId: z.string().cuid().optional(),
  status: z.enum(["OPEN", "ANSWERED"]).optional(),
  target: z.enum(["BRANCH", "SUPER_ADMIN"]).optional(),
});
export type ListParentQueriesQuery = z.infer<typeof listParentQueriesQuerySchema>;

export const parentQueryIdParamSchema = z.object({ queryId: z.string().cuid() });

import { z } from "zod";

export const listRegisteredQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  branchId: z.string().cuid().optional(),
  /** Omit for the default (REGISTERED only — the "not yet assigned" view). Pass a specific status to filter, or "ALL" (everyone except INACTIVE — used by Assign Tutor's picker, since a tutor/student can take on more than one assignment). */
  status: z.enum(["REGISTERED", "ASSIGNED", "ACTIVE", "INACTIVE", "ALL"]).optional(),
});

export const profileIdParamSchema = z.object({ id: z.string().cuid() });

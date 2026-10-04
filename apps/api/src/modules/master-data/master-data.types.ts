import { z } from "zod";

// ── Subjects — global, not branch-scoped ────────────────────────────────
export const createSubjectSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const subjectIdParamSchema = z.object({ subjectId: z.string().cuid() });

// ── Areas — scoped to one branch ("a particular location") ─────────────
export const createAreaSchema = z.object({
  branchId: z.string().cuid(),
  name: z.string().min(1).max(120),
});
export type CreateAreaInput = z.infer<typeof createAreaSchema>;

export const listAreasQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
});

export const areaIdParamSchema = z.object({ areaId: z.string().cuid() });

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
  // Pasted in from Google Maps — lets the branch-to-area distance column
  // (Super Admin's Subjects & Areas page) be computed without a mapping/
  // geocoding service. Optional: an area can exist with just a name.
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});
export type CreateAreaInput = z.infer<typeof createAreaSchema>;

export const listAreasQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  search: z.string().optional(),
});

export const areaIdParamSchema = z.object({ areaId: z.string().cuid() });

export const geocodeAreaQuerySchema = z.object({
  q: z.string().min(2).max(120),
});

import { z } from "zod";

export const reportQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  branchId: z.string().cuid().optional(),
  // Free-text name filters — office roles only (a tutor's own reports are
  // already scoped to themselves via effectiveTutorId, and studentName has
  // no meaning there since TUTOR can't reach the student-fees report).
  tutorName: z.string().optional(),
  studentName: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
});
export type ReportQuery = z.infer<typeof reportQuerySchema> & { tutorId?: string };

export const markTutorPaidSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  amount: z.coerce.number().positive(),
});
export type MarkTutorPaidInput = z.infer<typeof markTutorPaidSchema>;

export const tutorIdParamSchema = z.object({ tutorId: z.string().cuid() });
export const studentIdParamSchema = z.object({ studentId: z.string().cuid() });

// The "click a row for details" dialogs (Reports page) reuse the report's
// own active from/to filter, but need none of reportQuerySchema's other
// fields (branchId/tutorName/studentName/format) — a specific id is already
// as scoped as it gets.
export const detailQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
export type DetailQuery = z.infer<typeof detailQuerySchema>;

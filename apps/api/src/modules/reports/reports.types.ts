import { z } from "zod";
import { istStartOfDay, istEndOfDay } from "@/common/utils/istDate";

// A plain "YYYY-MM-DD" query param (what every <input type="date"> on the
// Reports page sends) coerces to UTC midnight via z.coerce.date() — on an
// IST-ahead-of-UTC server, that boundary sits 5.5 hours before the actual
// start of that day in India, and "to" sits 5.5 hours before the actual
// END of that day. Same-day records created later in the IST day could
// fall just outside the filter until the UTC day rolled over. Normalizing
// here, once, means every report/detail-dialog/payout endpoint that uses
// these schemas gets the correct IST day boundaries automatically — see
// common/utils/istDate.ts and context/08-KNOWN-GAPS-AND-TODOS.md.
const istFromDate = z.coerce.date().transform(istStartOfDay);
const istToDate = z.coerce.date().transform(istEndOfDay);

export const reportQuerySchema = z.object({
  from: istFromDate,
  to: istToDate,
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
  from: istFromDate,
  to: istToDate,
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
  from: istFromDate,
  to: istToDate,
});
export type DetailQuery = z.infer<typeof detailQuerySchema>;

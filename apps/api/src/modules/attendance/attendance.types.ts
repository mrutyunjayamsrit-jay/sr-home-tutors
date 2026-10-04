import { z } from "zod";
import { optionalString } from "@/common/utils/zodHelpers";

export const listSessionsQuerySchema = z.object({
  date: z.coerce.date().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  branchId: z.string().cuid().optional(),
  assignmentId: z.string().cuid().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "ABSENT_STUDENT", "ABSENT_TUTOR", "CANCELLED"]).optional(),
  studentId: z.string().cuid().optional(),
});

export const markSessionSchema = z.object({
  status: z.enum(["COMPLETED", "ABSENT_STUDENT", "ABSENT_TUTOR", "CANCELLED"]),
  tutorCheckIn: z.coerce.date().optional(),
  tutorCheckOut: z.coerce.date().optional(),
  chaptersCovered: optionalString(z.string().max(500)),
  topicsCovered: optionalString(z.string().max(500)),
});
export type MarkSessionInput = z.infer<typeof markSessionSchema>;

export const sessionIdParamSchema = z.object({ sessionId: z.string().cuid() });

// ── Tutor-initiated check-in / check-out — location is the primary path,
// manual area the fallback when GPS isn't available. Same body shape for
// both check-in and check-out; which one happens is decided by the route.
export const locationCoordsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type LocationCoordsInput = z.infer<typeof locationCoordsSchema>;

export const manualAreaSchema = z.object({
  area: z.string().min(2, "Enter your current area").max(300),
  confirmMismatch: z.boolean().optional().default(false),
});
export type ManualAreaInput = z.infer<typeof manualAreaSchema>;

export const checkProximityQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type CheckProximityQuery = z.infer<typeof checkProximityQuerySchema>;

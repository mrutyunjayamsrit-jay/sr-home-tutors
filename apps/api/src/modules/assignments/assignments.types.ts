import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createAssignmentSchema = z.object({
  tutorId: z.string().cuid(),
  studentId: z.string().cuid(),
  subjects: z.array(z.string().min(1).max(60)).min(1, "At least one subject is required"),
  perClassRate: z.coerce.number().positive(),
  fixedClassesPerMonth: z.coerce.number().int().positive().max(200),
  fixedSalary: z.coerce.number().positive().optional(),
  classDurationMinutes: z.coerce.number().int().positive().max(480),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, "Select at least one day"),
  timeSlotStart: z.string().regex(TIME_RE, "Use 24h HH:mm"),
  timeSlotEnd: z.string().regex(TIME_RE, "Use 24h HH:mm"),
  startDate: z.coerce.date(),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]),
});

export const listAssignmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
  search: z.string().optional(),
  studentId: z.string().cuid().optional(),
});

export const assignmentIdParamSchema = z.object({ assignmentId: z.string().cuid() });

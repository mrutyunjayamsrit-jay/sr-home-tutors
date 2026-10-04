import { z } from "zod";

export const createTestResultSchema = z.object({
  assignmentId: z.string().cuid(),
  subject: z.string().min(1).max(100),
  topic: z.string().min(1).max(150),
  totalMarks: z.coerce.number().positive(),
  obtainedMarks: z.coerce.number().min(0),
  testDate: z.coerce.date(),
});
export type CreateTestResultInput = z.infer<typeof createTestResultSchema>;

export const updateTestResultSchema = createTestResultSchema.partial().omit({ assignmentId: true });

export const listTestResultsQuerySchema = z.object({
  assignmentId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
});

export const testResultIdParamSchema = z.object({ testResultId: z.string().cuid() });

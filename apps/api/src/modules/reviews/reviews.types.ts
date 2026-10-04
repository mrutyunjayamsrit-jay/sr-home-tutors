import { z } from "zod";

// Append-only by design (not an upsert-in-place) — each entry is a dated
// note ("Opinion of tutors" per the source spec), so a tutor builds a real
// progress history over the months rather than overwriting one static
// field every time. The most recent entry is what parent/student-facing
// views show; older ones stay visible as history.
export const createReviewSchema = z.object({
  assignmentId: z.string().cuid(),
  strengths: z.string().max(1000).optional(),
  weaknesses: z.string().max(1000).optional(),
  overallReview: z.string().max(2000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const listReviewsQuerySchema = z.object({
  assignmentId: z.string().cuid(),
});

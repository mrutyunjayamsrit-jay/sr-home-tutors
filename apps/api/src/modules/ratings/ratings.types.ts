import { z } from "zod";
import { optionalString } from "@/common/utils/zodHelpers";

// One rating per assignment, upserted — a parent revises their rating as
// their child's progress with that tutor continues, rather than piling up
// a dated log (unlike reviews.service.ts's append-only tutor notes).
export const rateTutorSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: optionalString(z.string().max(1000)),
});
export type RateTutorInput = z.infer<typeof rateTutorSchema>;

export const assignmentIdParamSchema = z.object({ assignmentId: z.string().cuid() });

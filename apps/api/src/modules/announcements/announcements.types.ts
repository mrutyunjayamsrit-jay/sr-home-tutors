import { z } from "zod";

export const createAnnouncementSchema = z.object({
  branchId: z.string().cuid().optional(), // omit (Super Admin only) for a global announcement
  title: z.string().min(2).max(150),
  body: z.string().min(1).max(4000),
  audience: z.enum(["ALL", "TUTORS", "PARENTS", "STUDENTS", "BRANCH_STAFF"]).default("ALL"),
  // Optional tag — "REFERRAL_BONUS" lets this announcement also surface as a
  // banner directly on the tutor/parent Refer pages, not just the generic
  // Announcements list.
  category: z.enum(["REFERRAL_BONUS"]).optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const listAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: z.enum(["REFERRAL_BONUS"]).optional(),
});

export const announcementIdParamSchema = z.object({ announcementId: z.string().cuid() });

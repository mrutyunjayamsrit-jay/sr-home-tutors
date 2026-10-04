import { z } from "zod";
import { createTutorEnquirySchema, createParentEnquirySchema } from "@/modules/enquiries/enquiries.types";

/**
 * Classic honeypot: a field real visitors never see or fill (hidden off-
 * screen on the form), but naive spam bots that auto-fill every input will.
 * Anything non-empty here means "not a human" — validated to reject.
 */
const honeypot = z
  .string()
  .max(0, "Submission rejected")
  .optional();

// Same shape the staff-facing enquiry forms use, but branchId is REQUIRED
// (there's no logged-in Branch Admin to default it to their own branch) and
// a honeypot is added since this endpoint is genuinely unauthenticated.
export const publicTutorEnquirySchema = createTutorEnquirySchema
  .extend({
    branchId: z.string().cuid("Please choose a branch"),
    companyWebsite: honeypot,
  });
export type PublicTutorEnquiryInput = z.infer<typeof publicTutorEnquirySchema>;

export const publicParentEnquirySchema = createParentEnquirySchema
  .extend({
    branchId: z.string().cuid("Please choose a branch"),
    companyWebsite: honeypot,
  });
export type PublicParentEnquiryInput = z.infer<typeof publicParentEnquirySchema>;

export const publicListAreasQuerySchema = z.object({
  branchId: z.string().cuid("Please choose a branch"),
});

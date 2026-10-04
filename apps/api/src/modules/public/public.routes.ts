import { Router } from "express";
import { publicController } from "./public.controller";
import { validate } from "@/middleware/validate";
import { publicFormRateLimiter } from "@/middleware/rateLimit";
import { publicTutorEnquirySchema, publicParentEnquirySchema, publicListAreasQuerySchema } from "./public.types";

export const publicRouter = Router();

// Genuinely unauthenticated — this is the marketing home page's data source
// (branch picker, support contact, the two enquiry forms). Never mount
// `authenticate` on this router; the apiRateLimiter (app-wide) plus the
// tighter publicFormRateLimiter on the two POSTs are the abuse control.
publicRouter.get("/branches", publicController.listBranches);
publicRouter.get("/contact", publicController.getContact);
// Subjects/areas Super Admin has added (see master-data module) — the same
// option lists the office-facing enquiry forms use, so an anonymous
// visitor picks from, not types free text into, the same fields.
publicRouter.get("/subjects", publicController.listSubjects);
publicRouter.get("/areas", validate({ query: publicListAreasQuerySchema }), publicController.listAreas);
publicRouter.post(
  "/enquiries/tutor",
  publicFormRateLimiter,
  validate({ body: publicTutorEnquirySchema }),
  publicController.submitTutorEnquiry,
);
publicRouter.post(
  "/enquiries/parent",
  publicFormRateLimiter,
  validate({ body: publicParentEnquirySchema }),
  publicController.submitParentEnquiry,
);

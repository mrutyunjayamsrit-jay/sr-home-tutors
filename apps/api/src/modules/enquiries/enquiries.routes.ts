import { Router } from "express";
import { enquiriesController } from "./enquiries.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import {
  createTutorEnquirySchema,
  updateTutorEnquirySchema,
  createParentEnquirySchema,
  updateParentEnquirySchema,
  updateEnquiryStatusSchema,
  convertEnquirySchema,
  listEnquiriesQuerySchema,
  enquiryIdParamSchema,
} from "./enquiries.types";

export const enquiriesRouter = Router();

enquiriesRouter.use(authenticate);

const officeOnly = authorize("SUPER_ADMIN", "BRANCH_ADMIN");
// A tutor may submit and manage their OWN tutor referrals (refer-a-tutor),
// and a tutor or parent may submit and manage their OWN student referrals
// (refer-a-student / refer-a-family) — see assertOwnEnquiryAccess in
// enquiries.service.ts. Never the rest of the branch's enquiry pipeline,
// and never accept/reject/register a referral themselves (that stays an
// office decision, since it provisions a real login).
const tutorReferral = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR");
const parentReferral = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR", "PARENT");

const listQ = validate({ query: listEnquiriesQuerySchema });
const idP = validate({ params: enquiryIdParamSchema });

enquiriesRouter.get("/tutors", tutorReferral, listQ, enquiriesController.listTutors);
enquiriesRouter.post("/tutors", tutorReferral, validate({ body: createTutorEnquirySchema }), enquiriesController.createTutor);
enquiriesRouter.get("/tutors/:enquiryId", tutorReferral, idP, enquiriesController.getTutor);
enquiriesRouter.patch("/tutors/:enquiryId", tutorReferral, idP, validate({ body: updateTutorEnquirySchema }), enquiriesController.updateTutor);
enquiriesRouter.patch("/tutors/:enquiryId/status", officeOnly, idP, validate({ body: updateEnquiryStatusSchema }), enquiriesController.updateTutorStatus);
enquiriesRouter.post("/tutors/:enquiryId/convert", officeOnly, idP, validate({ body: convertEnquirySchema }), enquiriesController.convertTutor);

enquiriesRouter.get("/parents", parentReferral, listQ, enquiriesController.listParents);
enquiriesRouter.post("/parents", parentReferral, validate({ body: createParentEnquirySchema }), enquiriesController.createParent);
enquiriesRouter.get("/parents/:enquiryId", parentReferral, idP, enquiriesController.getParent);
enquiriesRouter.patch("/parents/:enquiryId", parentReferral, idP, validate({ body: updateParentEnquirySchema }), enquiriesController.updateParent);
enquiriesRouter.patch("/parents/:enquiryId/status", officeOnly, idP, validate({ body: updateEnquiryStatusSchema }), enquiriesController.updateParentStatus);
enquiriesRouter.post("/parents/:enquiryId/convert", officeOnly, idP, validate({ body: convertEnquirySchema }), enquiriesController.convertParent);

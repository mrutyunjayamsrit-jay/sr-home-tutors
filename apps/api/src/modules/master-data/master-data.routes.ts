import { Router } from "express";
import { masterDataController } from "./master-data.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import {
  areaIdParamSchema,
  createAreaSchema,
  createSubjectSchema,
  listAreasQuerySchema,
  subjectIdParamSchema,
} from "./master-data.types";

export const masterDataRouter = Router();

masterDataRouter.use(authenticate);

// Office roles, plus tutors/parents submitting a referral (needed to
// populate the tutor/parent/referral enquiry forms' Subjects/Areas
// pickers) can read — only Super Admin maintains the lists.
const readAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR", "PARENT");
const writeAccess = authorize("SUPER_ADMIN");

masterDataRouter.get("/subjects", readAccess, masterDataController.listSubjects);
masterDataRouter.post("/subjects", writeAccess, validate({ body: createSubjectSchema }), masterDataController.createSubject);
masterDataRouter.delete("/subjects/:subjectId", writeAccess, validate({ params: subjectIdParamSchema }), masterDataController.deleteSubject);

masterDataRouter.get("/areas", readAccess, validate({ query: listAreasQuerySchema }), masterDataController.listAreas);
masterDataRouter.post("/areas", writeAccess, validate({ body: createAreaSchema }), masterDataController.createArea);
masterDataRouter.delete("/areas/:areaId", writeAccess, validate({ params: areaIdParamSchema }), masterDataController.deleteArea);

import { Router } from "express";
import { registrationController } from "./registration.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { listRegisteredQuerySchema, profileIdParamSchema } from "./registration.types";

export const registrationRouter = Router();

registrationRouter.use(authenticate);
registrationRouter.use(authorize("SUPER_ADMIN", "BRANCH_ADMIN"));

const listQ = validate({ query: listRegisteredQuerySchema });
const idP = validate({ params: profileIdParamSchema });

registrationRouter.get("/tutors", listQ, registrationController.listTutors);
registrationRouter.get("/tutors/:id", idP, registrationController.getTutor);
registrationRouter.get("/parents", listQ, registrationController.listParents);
registrationRouter.get("/parents/:id", idP, registrationController.getParent);

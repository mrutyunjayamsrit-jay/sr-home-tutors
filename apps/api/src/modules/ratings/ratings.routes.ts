import { Router } from "express";
import { ratingsController } from "./ratings.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { rateTutorSchema, assignmentIdParamSchema } from "./ratings.types";

export const ratingsRouter = Router();

ratingsRouter.use(authenticate);

// Office roles can read a rating (to inform Assign Tutor); a parent can
// read and write their own child's — never the tutor being rated.
ratingsRouter.get(
  "/assignments/:assignmentId",
  authorize("SUPER_ADMIN", "BRANCH_ADMIN", "PARENT"),
  validate({ params: assignmentIdParamSchema }),
  ratingsController.getForAssignment,
);
ratingsRouter.post(
  "/assignments/:assignmentId",
  authorize("PARENT"),
  validate({ params: assignmentIdParamSchema, body: rateTutorSchema }),
  ratingsController.rate,
);

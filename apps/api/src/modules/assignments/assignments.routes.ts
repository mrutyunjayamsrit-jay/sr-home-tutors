import { Router } from "express";
import { assignmentsController } from "./assignments.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createAssignmentSchema, updateAssignmentStatusSchema, listAssignmentsQuerySchema, assignmentIdParamSchema } from "./assignments.types";

export const assignmentsRouter = Router();

assignmentsRouter.use(authenticate);

// Read access: office roles (branch-scoped), a tutor viewing their own
// assignments, or a parent viewing their own children's (all self-scoped
// in the service layer, not by route). Matching/ending an assignment stays
// office-only.
const readAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR", "PARENT");
const writeAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN");

assignmentsRouter.get("/running", readAccess, assignmentsController.runningClasses);
assignmentsRouter.get("/", readAccess, validate({ query: listAssignmentsQuerySchema }), assignmentsController.list);
assignmentsRouter.post("/", writeAccess, validate({ body: createAssignmentSchema }), assignmentsController.create);
assignmentsRouter.get("/:assignmentId", readAccess, validate({ params: assignmentIdParamSchema }), assignmentsController.get);
assignmentsRouter.patch(
  "/:assignmentId/status",
  writeAccess,
  validate({ params: assignmentIdParamSchema, body: updateAssignmentStatusSchema }),
  assignmentsController.updateStatus,
);

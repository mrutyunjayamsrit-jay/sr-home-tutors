import { Router } from "express";
import { branchController } from "./branch.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize, requireBranchMatch } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { branchIdParamSchema, updateBranchSchema, createBranchSchema, setBranchPasswordSchema } from "./branch.types";

export const branchRouter = Router();

branchRouter.use(authenticate);

// Only Super Admin provisions/lists/edits branches at the top level.
branchRouter.post("/", authorize("SUPER_ADMIN"), validate({ body: createBranchSchema }), branchController.create);
branchRouter.get("/", authorize("SUPER_ADMIN"), branchController.list);

// Org-wide dashboard numbers — registered on a literal path, and BEFORE
// "/:branchId" below, so "/branches/org-summary" can never be swallowed by
// the dynamic branch-id route.
branchRouter.get("/org-summary", authorize("SUPER_ADMIN"), branchController.orgSummary);

// A Branch Admin may view/edit only their own branch; Super Admin any branch.
branchRouter.get(
  "/:branchId",
  validate({ params: branchIdParamSchema }),
  authorize("SUPER_ADMIN", "BRANCH_ADMIN"),
  requireBranchMatch((req) => req.params.branchId),
  branchController.get,
);
branchRouter.patch(
  "/:branchId",
  validate({ params: branchIdParamSchema, body: updateBranchSchema }),
  authorize("SUPER_ADMIN", "BRANCH_ADMIN"),
  requireBranchMatch((req) => req.params.branchId),
  branchController.update,
);
// Setting the office login's password is Super Admin only — not
// "BRANCH_ADMIN, requireBranchMatch" like the routes above, since a branch
// admin already has their own self-service /auth/change-password.
branchRouter.post(
  "/:branchId/password",
  authorize("SUPER_ADMIN"),
  validate({ params: branchIdParamSchema, body: setBranchPasswordSchema }),
  branchController.setPassword,
);
branchRouter.get(
  "/:branchId/stats",
  validate({ params: branchIdParamSchema }),
  authorize("SUPER_ADMIN", "BRANCH_ADMIN"),
  requireBranchMatch((req) => req.params.branchId),
  branchController.stats,
);

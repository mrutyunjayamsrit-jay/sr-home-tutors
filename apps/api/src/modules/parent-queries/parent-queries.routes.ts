import { Router } from "express";
import { parentQueriesController } from "./parent-queries.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createParentQuerySchema, answerParentQuerySchema, listParentQueriesQuerySchema, parentQueryIdParamSchema } from "./parent-queries.types";

export const parentQueriesRouter = Router();

parentQueriesRouter.use(authenticate);

// Only a parent may ask (always addressed by them, about themselves); the
// office (Branch Admin, own branch's BRANCH-targeted queries only) and
// Super Admin (everything) may read and answer — see
// parent-queries.service.ts for the exact scoping.
const readAndAnswer = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "PARENT");

parentQueriesRouter.post("/", authorize("PARENT"), validate({ body: createParentQuerySchema }), parentQueriesController.create);
parentQueriesRouter.get("/", readAndAnswer, validate({ query: listParentQueriesQuerySchema }), parentQueriesController.list);
parentQueriesRouter.patch(
  "/:queryId/answer",
  authorize("SUPER_ADMIN", "BRANCH_ADMIN"),
  validate({ params: parentQueryIdParamSchema, body: answerParentQuerySchema }),
  parentQueriesController.answer,
);

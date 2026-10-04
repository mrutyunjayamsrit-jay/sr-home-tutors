import { Router } from "express";
import { testsController } from "./tests.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createTestResultSchema, updateTestResultSchema, listTestResultsQuerySchema, testResultIdParamSchema } from "./tests.types";

export const testsRouter = Router();

testsRouter.use(authenticate);

// Read access includes a parent viewing their own children's marks
// (self-scoped in the service layer). Entering/editing/deleting marks
// stays tutor/office-only.
const readAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR", "PARENT");
const writeAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR");

testsRouter.get("/", readAccess, validate({ query: listTestResultsQuerySchema }), testsController.list);
testsRouter.post("/", writeAccess, validate({ body: createTestResultSchema }), testsController.create);
testsRouter.patch("/:testResultId", writeAccess, validate({ params: testResultIdParamSchema, body: updateTestResultSchema }), testsController.update);
testsRouter.delete("/:testResultId", writeAccess, validate({ params: testResultIdParamSchema }), testsController.remove);

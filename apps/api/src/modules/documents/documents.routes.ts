import { Router } from "express";
import { documentsController } from "./documents.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { documentIdParamSchema, listDocumentsQuerySchema } from "./documents.types";

export const documentsRouter = Router();

documentsRouter.use(authenticate);
// TUTOR is scoped down to STUDENT-owned (study material) documents for
// their own students only; PARENT down to their own child's, read-only —
// both enforced in documents.service.ts, not here.
const readAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR", "PARENT");
const writeAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR");

documentsRouter.post("/", writeAccess, documentsController.uploadMiddleware, documentsController.upload);
documentsRouter.get("/", readAccess, validate({ query: listDocumentsQuerySchema }), documentsController.list);
documentsRouter.get("/:documentId/download", readAccess, validate({ params: documentIdParamSchema }), documentsController.download);
documentsRouter.delete("/:documentId", writeAccess, validate({ params: documentIdParamSchema }), documentsController.remove);

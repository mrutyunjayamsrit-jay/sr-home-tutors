import { Router } from "express";
import { familyController } from "./family.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { childIdParamSchema, updateMyLocationSchema } from "./family.types";

export const familyRouter = Router();

familyRouter.use(authenticate);
familyRouter.use(authorize("PARENT"));

familyRouter.get("/children", familyController.listChildren);
familyRouter.get("/children/:studentId", validate({ params: childIdParamSchema }), familyController.getChild);

// Home location for location-verified attendance (see
// attendance.service.ts markWithLocation) — self-service, so it stays
// accurate without ever routing through office staff.
familyRouter.get("/location", familyController.getMyLocation);
familyRouter.put("/location", validate({ body: updateMyLocationSchema }), familyController.updateMyLocation);

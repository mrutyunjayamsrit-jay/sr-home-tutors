import { Router } from "express";
import { settingsController } from "./settings.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { updateSettingsSchema } from "./settings.types";

export const settingsRouter = Router();

settingsRouter.use(authenticate);

// Readable by any authenticated role — org name/support contact and the
// tutor rules text are meant to be shown across the app (e.g. to tutors at
// login), not just to admins. Only Super Admin can change them.
settingsRouter.get("/", settingsController.get);
settingsRouter.patch("/", authorize("SUPER_ADMIN"), validate({ body: updateSettingsSchema }), settingsController.update);

import { Router } from "express";
import { announcementsController } from "./announcements.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createAnnouncementSchema, listAnnouncementsQuerySchema, announcementIdParamSchema } from "./announcements.types";

export const announcementsRouter = Router();

announcementsRouter.use(authenticate);

// Everyone can read (audience-filtered in the service); only office roles publish/remove.
announcementsRouter.get("/", validate({ query: listAnnouncementsQuerySchema }), announcementsController.list);
announcementsRouter.post(
  "/",
  authorize("SUPER_ADMIN", "BRANCH_ADMIN"),
  validate({ body: createAnnouncementSchema }),
  announcementsController.create,
);
announcementsRouter.delete(
  "/:announcementId",
  authorize("SUPER_ADMIN", "BRANCH_ADMIN"),
  validate({ params: announcementIdParamSchema }),
  announcementsController.remove,
);

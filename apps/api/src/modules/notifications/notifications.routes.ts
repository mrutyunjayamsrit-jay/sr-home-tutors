import { Router } from "express";
import { notificationsController } from "./notifications.controller";
import { authenticate } from "@/middleware/authenticate";
import { validate } from "@/middleware/validate";
import { listNotificationsQuerySchema, notificationIdParamSchema } from "./notifications.types";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

// Any authenticated role can have notifications — today that's Branch
// Admin (their own attendance reminder) and Super Admin (branch-missed
// escalations), see notifications.service.ts, but the endpoint itself
// isn't role-restricted since it's always scoped to the caller's own rows.
notificationsRouter.get("/", validate({ query: listNotificationsQuerySchema }), notificationsController.list);
notificationsRouter.get("/unread-count", notificationsController.unreadCount);
notificationsRouter.patch("/:notificationId/read", validate({ params: notificationIdParamSchema }), notificationsController.markRead);
notificationsRouter.post("/read-all", notificationsController.markAllRead);

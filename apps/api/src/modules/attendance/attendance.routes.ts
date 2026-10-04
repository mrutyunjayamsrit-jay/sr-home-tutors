import { Router } from "express";
import { attendanceController } from "./attendance.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { attendanceMarkRateLimiter } from "@/middleware/rateLimit";
import {
  listSessionsQuerySchema,
  markSessionSchema,
  sessionIdParamSchema,
  locationCoordsSchema,
  manualAreaSchema,
  checkProximityQuerySchema,
} from "./attendance.types";

export const attendanceRouter = Router();

attendanceRouter.use(authenticate);

// Read access: office roles (branch-scoped), a tutor viewing their own
// classes, or a parent viewing their own children's (self-scoped in the
// service layer). Marking attendance stays office/tutor-only — a parent
// only ever reads.
const readAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR", "PARENT");
const markAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR");

attendanceRouter.get("/sessions", readAccess, validate({ query: listSessionsQuerySchema }), attendanceController.list);
attendanceRouter.patch(
  "/sessions/:sessionId",
  markAccess,
  validate({ params: sessionIdParamSchema, body: markSessionSchema }),
  attendanceController.mark,
);

// Tutor-initiated check-in/check-out (see attendance.service.ts) — location
// is the primary path (the tutor's own GPS checked against the parent's
// home, no parent involvement needed); manual-area is the fallback when GPS
// isn't available. Both tutor-only and gated purely by proximity — never a
// scheduled-time window, so a class that starts late or overruns doesn't
// lock the tutor out. Office roles keep using the unrestricted manual PATCH
// above for anything else (marking absent, cancelling, backdating).
attendanceRouter.post(
  "/sessions/:sessionId/check-in-location",
  authorize("TUTOR"),
  attendanceMarkRateLimiter,
  validate({ params: sessionIdParamSchema, body: locationCoordsSchema }),
  attendanceController.checkInLocation,
);
attendanceRouter.post(
  "/sessions/:sessionId/check-in-area",
  authorize("TUTOR"),
  attendanceMarkRateLimiter,
  validate({ params: sessionIdParamSchema, body: manualAreaSchema }),
  attendanceController.checkInArea,
);
attendanceRouter.post(
  "/sessions/:sessionId/check-out-location",
  authorize("TUTOR"),
  attendanceMarkRateLimiter,
  validate({ params: sessionIdParamSchema, body: locationCoordsSchema }),
  attendanceController.checkOutLocation,
);
attendanceRouter.post(
  "/sessions/:sessionId/check-out-area",
  authorize("TUTOR"),
  attendanceMarkRateLimiter,
  validate({ params: sessionIdParamSchema, body: manualAreaSchema }),
  attendanceController.checkOutArea,
);

// Read-only precheck behind the Check In / Check Out buttons' enabled state
// (see attendance.service.ts checkProximity) — lets the UI reflect real
// proximity before the tutor even taps the button.
attendanceRouter.get(
  "/sessions/:sessionId/proximity",
  authorize("TUTOR"),
  validate({ params: sessionIdParamSchema, query: checkProximityQuerySchema }),
  attendanceController.checkProximity,
);

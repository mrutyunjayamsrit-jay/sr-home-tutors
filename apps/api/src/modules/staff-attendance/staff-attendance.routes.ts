import { Router } from "express";
import { staffAttendanceController } from "./staff-attendance.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { checkTimeSchema, listMineQuerySchema, overviewQuerySchema } from "./staff-attendance.types";

export const staffAttendanceRouter = Router();

staffAttendanceRouter.use(authenticate);

// Self check-in/out is Branch Admin only — this is the office's own daily
// attendance, distinct from the tutor/student class attendance elsewhere.
const selfAccess = authorize("BRANCH_ADMIN");

staffAttendanceRouter.get("/today", selfAccess, staffAttendanceController.today);
staffAttendanceRouter.get("/mine", selfAccess, validate({ query: listMineQuerySchema }), staffAttendanceController.listMine);
staffAttendanceRouter.post("/check-in", selfAccess, validate({ body: checkTimeSchema }), staffAttendanceController.checkIn);
staffAttendanceRouter.post("/check-out", selfAccess, validate({ body: checkTimeSchema }), staffAttendanceController.checkOut);

// Oversight — Super Admin only (enforced again in the service layer).
staffAttendanceRouter.get(
  "/overview",
  authorize("SUPER_ADMIN"),
  validate({ query: overviewQuerySchema }),
  staffAttendanceController.overview,
);

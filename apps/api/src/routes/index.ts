import { Router } from "express";
import { authRouter } from "@/modules/auth/auth.routes";
import { branchRouter } from "@/modules/branches/branch.routes";
import { usersRouter } from "@/modules/users/users.routes";
import { reportsRouter } from "@/modules/reports/reports.routes";
import { settingsRouter } from "@/modules/settings/settings.routes";
import { documentsRouter } from "@/modules/documents/documents.routes";
import { enquiriesRouter } from "@/modules/enquiries/enquiries.routes";
import { registrationRouter } from "@/modules/registration/registration.routes";
import { assignmentsRouter } from "@/modules/assignments/assignments.routes";
import { attendanceRouter } from "@/modules/attendance/attendance.routes";
import { feesRouter } from "@/modules/fees/fees.routes";
import { expensesRouter } from "@/modules/expenses/expenses.routes";
import { testsRouter } from "@/modules/tests/tests.routes";
import { reviewsRouter } from "@/modules/reviews/reviews.routes";
import { familyRouter } from "@/modules/family/family.routes";
import { announcementsRouter } from "@/modules/announcements/announcements.routes";
import { publicRouter } from "@/modules/public/public.routes";
import { staffAttendanceRouter } from "@/modules/staff-attendance/staff-attendance.routes";
import { notificationsRouter } from "@/modules/notifications/notifications.routes";
import { masterDataRouter } from "@/modules/master-data/master-data.routes";
import { tasksRouter } from "@/modules/tasks/tasks.routes";
import { parentQueriesRouter } from "@/modules/parent-queries/parent-queries.routes";

export const apiRouter = Router();

apiRouter.use("/public", publicRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/branches", branchRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/enquiries", enquiriesRouter);
apiRouter.use("/registration", registrationRouter);
apiRouter.use("/assignments", assignmentsRouter);
apiRouter.use("/attendance", attendanceRouter);
apiRouter.use("/fees", feesRouter);
apiRouter.use("/expenses", expensesRouter);
apiRouter.use("/tests", testsRouter);
apiRouter.use("/reviews", reviewsRouter);
apiRouter.use("/family", familyRouter);
apiRouter.use("/announcements", announcementsRouter);
apiRouter.use("/staff-attendance", staffAttendanceRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/master-data", masterDataRouter);
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/parent-queries", parentQueriesRouter);

// Remaining planned modules (payroll finalization) are wired here as each
// is built — see docs/ARCHITECTURE.md §6.

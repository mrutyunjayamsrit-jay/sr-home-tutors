import { Router } from "express";
import { reportsController } from "./reports.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { reportQuerySchema, markTutorPaidSchema, tutorIdParamSchema, studentIdParamSchema, detailQuerySchema } from "./reports.types";

export const reportsRouter = Router();

reportsRouter.use(authenticate);
// Branch Admins can run these for their own branch, Super Admin for any
// branch, a Tutor for their own assignments only (all forced server-side —
// see reports.controller.ts's effectiveBranchId/effectiveTutorId). The
// student-fees report additionally excludes TUTOR entirely at the
// controller level — billing is between the institute and the parent.
reportsRouter.use(authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR"));

const validateQuery = validate({ query: reportQuerySchema });

reportsRouter.get("/attendance/tutors", validateQuery, reportsController.tutorAttendance);
reportsRouter.get("/attendance/students", validateQuery, reportsController.studentAttendance);
reportsRouter.get("/payments/tutors", validateQuery, reportsController.tutorPayments);
// Office-only aggregate view (Paid/Outstanding per tutor) — enforced again
// in the controller, same pattern as fees/students below.
reportsRouter.get("/payments/tutors/summary", validateQuery, reportsController.tutorPaymentsSummary);
// Recording a payout is office-only — enforced again in the service layer
// (a TUTOR is otherwise allowed on this router to read their own reports).
reportsRouter.post(
  "/payments/tutors/:tutorId/pay",
  validate({ params: tutorIdParamSchema, body: markTutorPaidSchema }),
  reportsController.markTutorPaid,
);
reportsRouter.get("/fees/students", validateQuery, reportsController.studentFees);
reportsRouter.get("/fees/enquiries", validateQuery, reportsController.parentEnquiryFees);

// Row-click detail dialogs on the Reports page — office+Super Admin only
// (enforced again in the controller), same reasoning as fees/students above.
reportsRouter.get(
  "/tutors/:tutorId/detail",
  validate({ params: tutorIdParamSchema, query: detailQuerySchema }),
  reportsController.tutorDetail,
);
reportsRouter.get(
  "/students/:studentId/detail",
  validate({ params: studentIdParamSchema, query: detailQuerySchema }),
  reportsController.studentDetail,
);

import type { Request, Response } from "express";
import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok } from "@/common/utils/apiResponse";
import { ForbiddenError } from "@/common/errors/AppError";
import { reportsService, reportCsv } from "./reports.service";
import { reportQuerySchema, markTutorPaidSchema, detailQuerySchema } from "./reports.types";

/** Branch Admins only ever see their own branch, regardless of what's in the query string. A tutor has no branch-wide view at all — see effectiveTutorId. */
function effectiveBranchId(req: Request, requested: string | undefined) {
  if (req.user!.role === "TUTOR") return undefined;
  if (req.user!.role === "BRANCH_ADMIN") return req.user!.branchId ?? undefined;
  return requested;
}

/** A tutor only ever sees their own assignments — forced server-side, never client-supplied. */
function effectiveTutorId(req: Request) {
  return req.user!.role === "TUTOR" ? req.user!.profileId : undefined;
}

function sendCsv(res: Response, filename: string, csv: string) {
  res.status(200);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

export const reportsController = {
  tutorAttendance: asyncHandler(async (req, res) => {
    const query = reportQuerySchema.parse(req.query);
    const branchId = effectiveBranchId(req, query.branchId);
    const tutorId = effectiveTutorId(req);
    const result = await reportsService.tutorAttendance({ ...query, branchId, tutorId });
    if (query.format === "csv") return sendCsv(res, "tutor-attendance.csv", reportCsv.tutorAttendance(result.rows));
    ok(res, result);
  }),

  studentAttendance: asyncHandler(async (req, res) => {
    const query = reportQuerySchema.parse(req.query);
    const branchId = effectiveBranchId(req, query.branchId);
    const tutorId = effectiveTutorId(req);
    const result = await reportsService.studentAttendance({ ...query, branchId, tutorId });
    if (query.format === "csv") return sendCsv(res, "student-attendance.csv", reportCsv.studentAttendance(result.rows));
    ok(res, result);
  }),

  tutorPayments: asyncHandler(async (req, res) => {
    const query = reportQuerySchema.parse(req.query);
    const branchId = effectiveBranchId(req, query.branchId);
    const tutorId = effectiveTutorId(req);
    const result = await reportsService.tutorPayments({ ...query, branchId, tutorId });
    if (query.format === "csv") return sendCsv(res, "tutor-payments.csv", reportCsv.tutorPayments(result.rows));
    ok(res, result);
  }),

  tutorPaymentsSummary: asyncHandler(async (req, res) => {
    const query = reportQuerySchema.parse(req.query);
    const branchId = effectiveBranchId(req, query.branchId);
    if (req.user!.role === "TUTOR") throw new ForbiddenError("Not available to tutors");
    const result = await reportsService.tutorPaymentsSummary({ ...query, branchId });
    if (query.format === "csv") return sendCsv(res, "tutor-payments-summary.csv", reportCsv.tutorPaymentsSummary(result.rows));
    ok(res, result);
  }),

  markTutorPaid: asyncHandler(async (req, res) => {
    const input = markTutorPaidSchema.parse(req.body);
    const payout = await reportsService.markTutorPaid(req.params.tutorId!, input, req.user!);
    ok(res, payout);
  }),

  studentFees: asyncHandler(async (req, res) => {
    // Fee/billing information is between the institute and the parent — a
    // tutor has no business reason to see it, so this one report is office+
    // super-admin only even though the route otherwise allows TUTOR.
    if (req.user!.role === "TUTOR") throw new ForbiddenError("Not available to tutors");
    const query = reportQuerySchema.parse(req.query);
    const branchId = effectiveBranchId(req, query.branchId);
    const result = await reportsService.studentFees({ ...query, branchId });
    if (query.format === "csv") return sendCsv(res, "student-fees.csv", reportCsv.studentFees(result.rows));
    ok(res, result);
  }),

  parentEnquiryFees: asyncHandler(async (req, res) => {
    // Same reasoning as studentFees above — billing/negotiation detail, not for TUTOR.
    if (req.user!.role === "TUTOR") throw new ForbiddenError("Not available to tutors");
    const query = reportQuerySchema.parse(req.query);
    const branchId = effectiveBranchId(req, query.branchId);
    const result = await reportsService.parentEnquiryFees({ ...query, branchId, studentName: query.studentName });
    if (query.format === "csv") return sendCsv(res, "parent-enquiry-fees.csv", reportCsv.parentEnquiryFees(result.rows));
    ok(res, result);
  }),

  // ── Row-click detail dialogs (Reports page) ────────────────────────────
  tutorDetail: asyncHandler(async (req, res) => {
    if (req.user!.role === "TUTOR") throw new ForbiddenError("Not available to tutors");
    const query = detailQuerySchema.parse(req.query);
    const result = await reportsService.tutorDetail(req.params.tutorId!, query, req.user!);
    ok(res, result);
  }),

  studentDetail: asyncHandler(async (req, res) => {
    if (req.user!.role === "TUTOR") throw new ForbiddenError("Not available to tutors");
    const query = detailQuerySchema.parse(req.query);
    const result = await reportsService.studentDetail(req.params.studentId!, query, req.user!);
    ok(res, result);
  }),
};

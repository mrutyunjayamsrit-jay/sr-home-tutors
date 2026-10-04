import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError } from "@/common/errors/AppError";
import { reportsRepository } from "./reports.repository";
import { toCsv } from "@/common/utils/csv";
import { SHORT_CLASS_THRESHOLD_MINUTES } from "@/common/constants/attendance";
import type { DetailQuery, MarkTutorPaidInput, ReportQuery } from "./reports.types";

interface Actor {
  role: string;
  branchId: string | null;
}

const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Identifies "this exact reporting window" for a tutor payout — not a calendar month, since the report itself is an arbitrary from/to range. Re-running the report with the same range always lines up with the same payout row; a different range is treated as a different period. */
function periodKey(from: Date, to: Date) {
  return `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;
}

async function assignmentRows(query: Pick<ReportQuery, "from" | "to" | "branchId" | "tutorId" | "tutorName">) {
  return reportsRepository.assignmentsInRange(query.from, query.to, query.branchId, query.tutorId, query.tutorName);
}

export const reportsService = {
  /**
   * PDF §5.1 "tutor attendance report" — one row per tutor↔student
   * assignment (the source spec's per-tutor drill-down table, flattened to
   * one sortable/exportable list rather than a nested per-tutor view).
   */
  async tutorAttendance(query: ReportQuery) {
    const assignments = await assignmentRows(query);
    const rows = assignments.map((a) => {
      const completedSessions = a.sessions.filter((s) => s.status === "COMPLETED");
      const present = completedSessions.length;
      const absent = a.sessions.filter((s) => s.status === "ABSENT_TUTOR").length;
      const workedMinutes = completedSessions.reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
      // Real check-in→check-out duration under the threshold — see
      // attendance.service.ts checkOutWithLocation/Area for where
      // actualDurationMinutes now comes from an actual timestamp
      // difference rather than the scheduled slot.
      const shortClasses = completedSessions.filter(
        (s) => s.actualDurationMinutes != null && s.actualDurationMinutes < SHORT_CLASS_THRESHOLD_MINUTES,
      ).length;
      return {
        assignmentId: a.id,
        tutorName: a.tutor.name,
        studentName: a.student.name,
        studentClass: a.student.studentClass,
        fixedClasses: a.fixedClassesPerMonth,
        fixedFees: Number(a.perClassRate),
        fixedDurationMinutes: a.classDurationMinutes,
        present,
        absent,
        totalHoursWorked: hours(workedMinutes),
        shortClasses,
      };
    });
    return { rows, generatedAt: new Date() };
  },

  /** PDF §5.1 "student attendance report." */
  async studentAttendance(query: ReportQuery) {
    const assignments = await assignmentRows(query);
    const rows = assignments.map((a) => {
      const attended = a.sessions.filter((s) => s.status === "COMPLETED").length;
      const chapters = Array.from(new Set(a.sessions.map((s) => s.chaptersCovered).filter(Boolean))).join("; ");
      const workedMinutes = a.sessions
        .filter((s) => s.status === "COMPLETED")
        .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
      return {
        assignmentId: a.id,
        studentName: a.student.name,
        tutorName: a.tutor.name,
        subjects: a.subjects.join(", "),
        classesAttended: attended,
        chaptersCompleted: chapters,
        totalTimeSpentHours: hours(workedMinutes),
      };
    });
    return { rows, generatedAt: new Date() };
  },

  /**
   * PDF §5.2 "tutor payment report" — one row per tutor↔student assignment,
   * same shape as before. This is what a TUTOR sees for their own earnings
   * (see EarningsPage/TutorReportsPage) — they want a per-student
   * breakdown, not a single aggregate figure, so this stays untouched.
   * The office-facing "who do we owe, and how much has been paid" view
   * lives in tutorPaymentsSummary below instead of reshaping this one.
   */
  async tutorPayments(query: ReportQuery) {
    const assignments = await assignmentRows(query);
    const rows = assignments.map((a) => {
      const classesTaken = a.sessions.filter((s) => s.status === "COMPLETED").length;
      const classesAbsent = a.sessions.filter((s) => s.status === "ABSENT_TUTOR").length;
      const workedMinutes = a.sessions
        .filter((s) => s.status === "COMPLETED")
        .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
      const rate = Number(a.perClassRate);
      return {
        assignmentId: a.id,
        tutorName: a.tutor.name,
        studentName: a.student.name,
        fixedClasses: a.fixedClassesPerMonth,
        classesTaken,
        classesAbsent,
        fixedFees: rate,
        totalHoursTaught: hours(workedMinutes),
        payableAmount: round2(classesTaken * rate),
      };
    });
    const totalPayable = rows.reduce((sum, r) => sum + r.payableAmount, 0);
    return { rows, summary: { totalPayable }, generatedAt: new Date() };
  },

  /**
   * Office-facing view of the same underlying data, summed PER TUTOR
   * (across all their assignments in range) with real Paid/Outstanding —
   * Payable is still computed live from Assignment/ClassSession; Paid
   * comes from a real TutorPayout row for this exact date range, created
   * only via markTutorPaid below — never fabricated.
   */
  async tutorPaymentsSummary(query: ReportQuery) {
    const assignments = await assignmentRows(query);

    const byTutor = new Map<
      string,
      { tutorId: string; tutorName: string; fixedClasses: number; classesTaken: number; classesAbsent: number; workedMinutes: number; payableAmount: number }
    >();

    for (const a of assignments) {
      const rate = Number(a.perClassRate);
      const classesTaken = a.sessions.filter((s) => s.status === "COMPLETED").length;
      const classesAbsent = a.sessions.filter((s) => s.status === "ABSENT_TUTOR").length;
      const workedMinutes = a.sessions
        .filter((s) => s.status === "COMPLETED")
        .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);

      const existing = byTutor.get(a.tutorId) ?? {
        tutorId: a.tutorId,
        tutorName: a.tutor.name,
        fixedClasses: 0,
        classesTaken: 0,
        classesAbsent: 0,
        workedMinutes: 0,
        payableAmount: 0,
      };
      existing.fixedClasses += a.fixedClassesPerMonth;
      existing.classesTaken += classesTaken;
      existing.classesAbsent += classesAbsent;
      existing.workedMinutes += workedMinutes;
      existing.payableAmount += round2(classesTaken * rate);
      byTutor.set(a.tutorId, existing);
    }

    const period = periodKey(query.from, query.to);
    const tutorIds = [...byTutor.keys()];
    const payouts = tutorIds.length ? await reportsRepository.tutorPayoutsForPeriod(tutorIds, period) : [];
    const paidByTutor = new Map(payouts.map((p) => [p.tutorId, Number(p.payableAmount)]));

    const rows = [...byTutor.values()]
      .map((t) => {
        const payableAmount = round2(t.payableAmount);
        const paidAmount = paidByTutor.get(t.tutorId) ?? 0;
        const outstandingAmount = Math.max(0, round2(payableAmount - paidAmount));
        return {
          tutorId: t.tutorId,
          tutorName: t.tutorName,
          fixedClasses: t.fixedClasses,
          classesTaken: t.classesTaken,
          classesAbsent: t.classesAbsent,
          totalHoursTaught: hours(t.workedMinutes),
          payableAmount,
          paidAmount,
          outstandingAmount,
        };
      })
      .sort((a, b) => a.tutorName.localeCompare(b.tutorName));

    const summary = rows.reduce(
      (acc, r) => ({
        totalPayable: round2(acc.totalPayable + r.payableAmount),
        totalPaid: round2(acc.totalPaid + r.paidAmount),
        totalOutstanding: round2(acc.totalOutstanding + r.outstandingAmount),
      }),
      { totalPayable: 0, totalPaid: 0, totalOutstanding: 0 },
    );

    return { rows, summary, generatedAt: new Date(), period };
  },

  /**
   * Records a real payment to a tutor for this exact report's date range —
   * the only thing that ever writes a TutorPayout row. Recomputes
   * fixedClasses/classesTaken/rate itself from the same live data rather
   * than trusting whatever the client last displayed.
   */
  async markTutorPaid(tutorId: string, input: MarkTutorPaidInput, actor: Actor) {
    if (actor.role === "TUTOR") throw new ForbiddenError("Not available to tutors");

    const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!tutor) throw new NotFoundError("Tutor not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== tutor.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }

    const assignments = await reportsRepository.assignmentsInRange(input.from, input.to, undefined, tutorId);
    let fixedClasses = 0;
    let classesTaken = 0;
    let payableAmount = 0;
    for (const a of assignments) {
      const rate = Number(a.perClassRate);
      const taken = a.sessions.filter((s) => s.status === "COMPLETED").length;
      fixedClasses += a.fixedClassesPerMonth;
      classesTaken += taken;
      payableAmount += taken * rate;
    }
    const perClassRate = classesTaken > 0 ? round2(payableAmount / classesTaken) : 0;

    return reportsRepository.upsertTutorPayout({
      tutorId,
      period: periodKey(input.from, input.to),
      fixedClasses,
      classesTaken,
      perClassRate,
      baseAmount: input.amount,
      payableAmount: input.amount,
    });
  },

  /**
   * Every parent enquiry raised in range, prescribed vs. actually agreed
   * fees — the gap between "what the rate card says" (feesPrescribed,
   * prefilled from Super Admin's Fee Rate Cards when the enquiry was
   * raised — see the web CreateParentEnquiryDialog) and "what the branch
   * office actually settled on with the family" (agreedFinalFees). Either
   * can be unset (an office-entered enquiry may skip fees discussion
   * entirely), so summary totals only add up the rows that have a value.
   */
  async parentEnquiryFees(query: ReportQuery) {
    const enquiries = await reportsRepository.parentEnquiries(query.from, query.to, query.branchId, query.studentName);
    const rows = enquiries.map((e) => ({
      enquiryId: e.id,
      branchName: e.branch.name,
      studentName: e.studentName,
      studentClass: e.studentClass,
      board: e.board,
      feesPrescribed: e.feesPrescribed != null ? Number(e.feesPrescribed) : null,
      agreedFinalFees: e.agreedFinalFees != null ? Number(e.agreedFinalFees) : null,
      status: e.status,
      createdAt: e.createdAt,
    }));
    const summary = rows.reduce(
      (acc, r) => ({
        totalPrescribed: round2(acc.totalPrescribed + (r.feesPrescribed ?? 0)),
        totalAgreed: round2(acc.totalAgreed + (r.agreedFinalFees ?? 0)),
      }),
      { totalPrescribed: 0, totalAgreed: 0 },
    );
    return { rows, summary, generatedAt: new Date() };
  },

  /**
   * Everything Super Admin (or the owning Branch Admin) wants to know about
   * one tutor, opened from a row click on the Tutor Payments report — the
   * SAME from/to window already active on the page, so the payable/paid/
   * outstanding figures shown here always match the row that was clicked.
   */
  async tutorDetail(tutorId: string, query: DetailQuery, actor: Actor) {
    const tutor = await reportsRepository.tutorById(tutorId);
    if (!tutor) throw new NotFoundError("Tutor not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== tutor.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }

    const assignments = await reportsRepository.assignmentsInRange(query.from, query.to, undefined, tutorId);

    let present = 0;
    let absent = 0;
    let workedMinutes = 0;
    let shortClasses = 0;
    let fixedClasses = 0;

    const assignmentRows = assignments.map((a) => {
      const completed = a.sessions.filter((s) => s.status === "COMPLETED");
      const classesTaken = completed.length;
      const classesAbsent = a.sessions.filter((s) => s.status === "ABSENT_TUTOR").length;
      const minutes = completed.reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
      const short = completed.filter((s) => s.actualDurationMinutes != null && s.actualDurationMinutes < SHORT_CLASS_THRESHOLD_MINUTES).length;
      const rate = Number(a.perClassRate);

      fixedClasses += a.fixedClassesPerMonth;
      present += classesTaken;
      absent += classesAbsent;
      workedMinutes += minutes;
      shortClasses += short;

      return {
        assignmentId: a.id,
        studentName: a.student.name,
        studentClass: a.student.studentClass,
        subjects: a.subjects,
        fixedClasses: a.fixedClassesPerMonth,
        perClassRate: rate,
        status: a.status,
        classesTaken,
        classesAbsent,
        payableAmount: round2(classesTaken * rate),
      };
    });

    const payableAmount = round2(assignmentRows.reduce((sum, r) => sum + r.payableAmount, 0));
    const payouts = await reportsRepository.tutorPayoutsForPeriod([tutorId], periodKey(query.from, query.to));
    const paidAmount = payouts[0] ? Number(payouts[0].payableAmount) : 0;
    const outstandingAmount = Math.max(0, round2(payableAmount - paidAmount));

    return {
      profile: {
        id: tutor.id,
        name: tutor.name,
        gender: tutor.gender,
        education: tutor.education,
        contactNumber: tutor.contactNumber,
        categories: tutor.categories,
        subjects: tutor.subjects,
        areas: tutor.areas,
        status: tutor.status,
        startedAt: tutor.startedAt,
        branch: tutor.branch,
      },
      attendance: { fixedClasses, present, absent, totalHoursWorked: hours(workedMinutes), shortClasses },
      payments: { payableAmount, paidAmount, outstandingAmount },
      assignments: assignmentRows,
      period: { from: query.from, to: query.to },
    };
  },

  /**
   * Everything Super Admin (or the owning Branch Admin) wants to know about
   * one student, opened from a row click on the Student Fees report —
   * attendance is scoped to the report's own from/to window (present/absent
   * counts are meaningless without a period), but the fee invoice history
   * is shown in full since a single student's billing history is small and
   * more useful seen whole than clipped to the current filter.
   */
  async studentDetail(studentId: string, query: DetailQuery, actor: Actor) {
    const student = await reportsRepository.studentById(studentId);
    if (!student) throw new NotFoundError("Student not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== student.parent.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }

    const assignments = await reportsRepository.assignmentsInRange(query.from, query.to, undefined, undefined, undefined, studentId);

    let classesAttended = 0;
    let workedMinutes = 0;
    const chapters = new Set<string>();

    const assignmentRows = assignments.map((a) => {
      const completed = a.sessions.filter((s) => s.status === "COMPLETED");
      classesAttended += completed.length;
      workedMinutes += completed.reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
      completed.forEach((s) => {
        if (s.chaptersCovered) chapters.add(s.chaptersCovered);
      });
      return {
        assignmentId: a.id,
        tutorName: a.tutor.name,
        subjects: a.subjects,
        fixedClasses: a.fixedClassesPerMonth,
        perClassRate: Number(a.perClassRate),
        status: a.status,
        classesAttended: completed.length,
      };
    });

    const invoices = await reportsRepository.studentFeeInvoicesForStudent(studentId);
    const invoiceRows = invoices.map((inv) => ({
      id: inv.id,
      period: inv.period,
      fixedClasses: inv.fixedClasses,
      classesTaken: inv.classesTaken,
      fixedFees: Number(inv.fixedFees),
      payableFees: Number(inv.payableFees),
      paidAmount: Number(inv.paidAmount),
      balance: Number(inv.balance),
      status: inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
    }));
    const feesSummary = invoiceRows.reduce(
      (acc, r) => ({
        totalPayable: round2(acc.totalPayable + r.payableFees),
        totalPaid: round2(acc.totalPaid + r.paidAmount),
        totalBalance: round2(acc.totalBalance + r.balance),
      }),
      { totalPayable: 0, totalPaid: 0, totalBalance: 0 },
    );

    return {
      profile: {
        id: student.id,
        name: student.name,
        studentClass: student.studentClass,
        board: student.board,
        subjectsNeeded: student.subjectsNeeded,
        preferredTutorGender: student.preferredTutorGender,
        status: student.status,
        classStartedAt: student.classStartedAt,
        parent: { name: student.parent.name, contactNumber: student.parent.contactNumber },
        branch: student.parent.branch,
      },
      attendance: { classesAttended, totalTimeSpentHours: hours(workedMinutes), chaptersCompleted: [...chapters].join("; ") },
      fees: { invoices: invoiceRows, summary: feesSummary },
      assignments: assignmentRows,
      period: { from: query.from, to: query.to },
    };
  },

  /** PDF §5.3 "student fees report." */
  async studentFees(query: ReportQuery) {
    const invoices = await reportsRepository.studentFeeInvoices(query.from, query.to, query.branchId, query.studentName);
    const rows = invoices.map((inv) => ({
      studentId: inv.studentId,
      studentName: inv.student.name,
      studentClass: inv.student.studentClass,
      period: inv.period,
      fixedClasses: inv.fixedClasses,
      classesTaken: inv.classesTaken,
      fixedFees: Number(inv.fixedFees),
      payableFees: Number(inv.payableFees),
      paidAmount: Number(inv.paidAmount),
      balance: Number(inv.balance),
      status: inv.status,
      paidAt: inv.paidAt,
    }));
    const summary = rows.reduce(
      (acc, r) => ({
        totalPayable: round2(acc.totalPayable + r.payableFees),
        totalPaid: round2(acc.totalPaid + r.paidAmount),
        totalBalance: round2(acc.totalBalance + r.balance),
      }),
      { totalPayable: 0, totalPaid: 0, totalBalance: 0 },
    );
    return { rows, summary, generatedAt: new Date() };
  },
};

export const reportCsv = {
  tutorAttendance: (rows: Awaited<ReturnType<typeof reportsService.tutorAttendance>>["rows"]) =>
    toCsv(rows, [
      { key: "tutorName", header: "Tutor" },
      { key: "studentName", header: "Student" },
      { key: "studentClass", header: "Class" },
      { key: "fixedClasses", header: "Fixed Classes" },
      { key: "fixedFees", header: "Fixed Fee / Class" },
      { key: "fixedDurationMinutes", header: "Duration (min)" },
      { key: "present", header: "Present" },
      { key: "absent", header: "Absent" },
      { key: "totalHoursWorked", header: "Total Hours Worked" },
      { key: "shortClasses", header: "Classes Under 40 Min" },
    ]),
  studentAttendance: (rows: Awaited<ReturnType<typeof reportsService.studentAttendance>>["rows"]) =>
    toCsv(rows, [
      { key: "studentName", header: "Student" },
      { key: "tutorName", header: "Tutor" },
      { key: "subjects", header: "Subjects" },
      { key: "classesAttended", header: "Classes Attended" },
      { key: "chaptersCompleted", header: "Chapters Completed" },
      { key: "totalTimeSpentHours", header: "Total Time Spent (hrs)" },
    ]),
  tutorPayments: (rows: Awaited<ReturnType<typeof reportsService.tutorPayments>>["rows"]) =>
    toCsv(rows, [
      { key: "tutorName", header: "Tutor" },
      { key: "studentName", header: "Student" },
      { key: "fixedClasses", header: "Fixed Classes" },
      { key: "classesTaken", header: "Classes Taken" },
      { key: "classesAbsent", header: "Classes Absent" },
      { key: "fixedFees", header: "Rate / Class" },
      { key: "totalHoursTaught", header: "Total Hours Taught" },
      { key: "payableAmount", header: "Payable Amount" },
    ]),
  tutorPaymentsSummary: (rows: Awaited<ReturnType<typeof reportsService.tutorPaymentsSummary>>["rows"]) =>
    toCsv(rows, [
      { key: "tutorName", header: "Tutor" },
      { key: "fixedClasses", header: "Fixed Classes" },
      { key: "classesTaken", header: "Classes Taken" },
      { key: "classesAbsent", header: "Classes Absent" },
      { key: "totalHoursTaught", header: "Total Hours Taught" },
      { key: "payableAmount", header: "Payable Amount" },
      { key: "paidAmount", header: "Paid Amount" },
      { key: "outstandingAmount", header: "Outstanding Amount" },
    ]),
  studentFees: (rows: Awaited<ReturnType<typeof reportsService.studentFees>>["rows"]) =>
    toCsv(rows, [
      { key: "studentName", header: "Student" },
      { key: "studentClass", header: "Class" },
      { key: "period", header: "Period" },
      { key: "fixedClasses", header: "Fixed Classes" },
      { key: "classesTaken", header: "Classes Taken" },
      { key: "fixedFees", header: "Fixed Fees" },
      { key: "payableFees", header: "Payable Fees" },
      { key: "paidAmount", header: "Paid Amount" },
      { key: "balance", header: "Balance" },
      { key: "status", header: "Status" },
      { key: "paidAt", header: "Paid At" },
    ]),
  parentEnquiryFees: (rows: Awaited<ReturnType<typeof reportsService.parentEnquiryFees>>["rows"]) =>
    toCsv(rows, [
      { key: "branchName", header: "Branch" },
      { key: "studentName", header: "Student" },
      { key: "studentClass", header: "Class" },
      { key: "board", header: "Board" },
      { key: "feesPrescribed", header: "Fees Prescribed" },
      { key: "agreedFinalFees", header: "Agreed Final Fees" },
      { key: "status", header: "Enquiry Status" },
      { key: "createdAt", header: "Raised On" },
    ]),
};

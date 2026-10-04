import { prisma } from "@/common/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Every attendance/payment report is derived from the same source: real
 * Assignment + ClassSession rows (never a separately-maintained summary
 * number), so the numbers can't silently drift from what actually
 * happened. See docs/DATA-MODEL.md's ClassSession note. Until the
 * Assign-Tutor and Attendance modules exist, these correctly return
 * nothing — there's no fabricated data standing in for them.
 */
export const reportsRepository = {
  assignmentsInRange(from: Date, to: Date, branchId?: string, tutorId?: string, tutorName?: string, studentId?: string) {
    const where: Prisma.AssignmentWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(tutorId ? { tutorId } : {}),
      ...(studentId ? { studentId } : {}),
      ...(tutorName ? { tutor: { name: { contains: tutorName, mode: "insensitive" } } } : {}),
      startDate: { lte: to },
      OR: [{ endDate: null }, { endDate: { gte: from } }],
    };

    return prisma.assignment.findMany({
      where,
      include: {
        tutor: { select: { id: true, name: true } },
        student: { select: { id: true, name: true, studentClass: true } },
        sessions: {
          where: { scheduledDate: { gte: from, lte: to } },
          select: {
            status: true,
            actualDurationMinutes: true,
            chaptersCovered: true,
            topicsCovered: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  studentFeeInvoices(from: Date, to: Date, branchId?: string, studentName?: string) {
    return prisma.studentFeeInvoice.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(branchId ? { student: { parent: { branchId } } } : {}),
        ...(studentName ? { student: { name: { contains: studentName, mode: "insensitive" } } } : {}),
      },
      include: {
        student: {
          select: {
            name: true,
            studentClass: true,
            parent: { select: { name: true, contactNumber: true, branchId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** PDF-adjacent "what did we agree with this family" view — every parent enquiry raised in range, prescribed vs. actually agreed fees. */
  parentEnquiries(from: Date, to: Date, branchId?: string, studentName?: string) {
    return prisma.parentEnquiry.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(branchId ? { branchId } : {}),
        ...(studentName ? { studentName: { contains: studentName, mode: "insensitive" } } : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Payouts already recorded for a set of tutors within this exact reporting
   * period — see reports.service.ts markTutorPaid, which is the only thing
   * that ever creates one of these rows (period = the report's own
   * from/to range, not a calendar month).
   */
  tutorPayoutsForPeriod(tutorIds: string[], period: string) {
    return prisma.tutorPayout.findMany({ where: { tutorId: { in: tutorIds }, period } });
  },

  // ── Row-click detail dialogs (Reports page) ────────────────────────────
  tutorById(tutorId: string) {
    return prisma.tutor.findUnique({
      where: { id: tutorId },
      include: { branch: { select: { id: true, name: true } } },
    });
  },

  studentById(studentId: string) {
    return prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parent: { select: { name: true, contactNumber: true, branchId: true, branch: { select: { id: true, name: true } } } },
      },
    });
  },

  /** Full invoice history for one student — not date-range-limited, unlike the report list, since a single student's billing history is small and more useful shown in full. */
  studentFeeInvoicesForStudent(studentId: string) {
    return prisma.studentFeeInvoice.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } });
  },

  upsertTutorPayout(data: Prisma.TutorPayoutUncheckedCreateInput) {
    return prisma.tutorPayout.upsert({
      where: { tutorId_period: { tutorId: data.tutorId, period: data.period } },
      update: {
        fixedClasses: data.fixedClasses,
        classesTaken: data.classesTaken,
        perClassRate: data.perClassRate,
        baseAmount: data.baseAmount,
        payableAmount: data.payableAmount,
        status: "PAID",
        finalizedAt: new Date(),
        paidAt: new Date(),
      },
      create: { ...data, status: "PAID", finalizedAt: new Date(), paidAt: new Date() },
    });
  },
};

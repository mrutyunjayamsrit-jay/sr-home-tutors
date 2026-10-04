export interface TutorAttendanceRow {
  assignmentId: string;
  tutorName: string;
  studentName: string;
  studentClass: string;
  fixedClasses: number;
  fixedFees: number;
  fixedDurationMinutes: number;
  present: number;
  absent: number;
  totalHoursWorked: number;
  /** COMPLETED classes whose real check-in→check-out duration was under the short-class threshold — see reports.service.ts. */
  shortClasses: number;
}

export interface StudentAttendanceRow {
  assignmentId: string;
  studentName: string;
  tutorName: string;
  subjects: string;
  classesAttended: number;
  chaptersCompleted: string;
  totalTimeSpentHours: number;
}

export interface TutorPaymentRow {
  assignmentId: string;
  tutorName: string;
  studentName: string;
  fixedClasses: number;
  classesTaken: number;
  classesAbsent: number;
  fixedFees: number;
  totalHoursTaught: number;
  payableAmount: number;
}

/** Office-facing aggregate — one row per tutor, with real Paid/Outstanding. See reports.service.ts tutorPaymentsSummary. */
export interface TutorPaymentSummaryRow {
  tutorId: string;
  tutorName: string;
  fixedClasses: number;
  classesTaken: number;
  classesAbsent: number;
  totalHoursTaught: number;
  payableAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface StudentFeeRow {
  studentId: string;
  studentName: string;
  studentClass: string;
  period: string;
  fixedClasses: number;
  classesTaken: number;
  fixedFees: number;
  payableFees: number;
  paidAmount: number;
  balance: number;
  status: string;
  paidAt: string | null;
}

/** Prescribed vs. actually agreed fees for a parent enquiry — see reports.service.ts's parentEnquiryFees. */
export interface ParentEnquiryFeeRow {
  enquiryId: string;
  branchName: string;
  studentName: string;
  studentClass: string;
  board: string;
  feesPrescribed: number | null;
  agreedFinalFees: number | null;
  status: string;
  createdAt: string;
}

// ── Row-click detail dialogs (Reports page) ─────────────────────────────
export interface TutorDetailAssignmentRow {
  assignmentId: string;
  studentName: string;
  studentClass: string;
  subjects: string[];
  fixedClasses: number;
  perClassRate: number;
  status: string;
  classesTaken: number;
  classesAbsent: number;
  payableAmount: number;
}

/** See reports.service.ts's tutorDetail. */
export interface TutorDetail {
  profile: {
    id: string;
    name: string;
    gender: string | null;
    education: string;
    contactNumber: string;
    categories: string[];
    subjects: string[];
    areas: string[];
    status: string;
    startedAt: string | null;
    branch: { id: string; name: string };
  };
  attendance: { fixedClasses: number; present: number; absent: number; totalHoursWorked: number; shortClasses: number };
  payments: { payableAmount: number; paidAmount: number; outstandingAmount: number };
  assignments: TutorDetailAssignmentRow[];
  period: { from: string; to: string };
}

export interface StudentDetailAssignmentRow {
  assignmentId: string;
  tutorName: string;
  subjects: string[];
  fixedClasses: number;
  perClassRate: number;
  status: string;
  classesAttended: number;
}

export interface StudentDetailInvoiceRow {
  id: string;
  period: string;
  fixedClasses: number;
  classesTaken: number;
  fixedFees: number;
  payableFees: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
}

/** See reports.service.ts's studentDetail. */
export interface StudentDetail {
  profile: {
    id: string;
    name: string;
    studentClass: string;
    board: string;
    subjectsNeeded: string[];
    preferredTutorGender: string | null;
    status: string;
    classStartedAt: string | null;
    parent: { name: string; contactNumber: string };
    branch: { id: string; name: string };
  };
  attendance: { classesAttended: number; totalTimeSpentHours: number; chaptersCompleted: string };
  fees: { invoices: StudentDetailInvoiceRow[]; summary: { totalPayable: number; totalPaid: number; totalBalance: number } };
  assignments: StudentDetailAssignmentRow[];
  period: { from: string; to: string };
}

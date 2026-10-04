import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiDownload, ApiError } from "@/lib/apiClient";
import type {
  ParentEnquiryFeeRow,
  StudentAttendanceRow,
  StudentDetail,
  StudentFeeRow,
  TutorAttendanceRow,
  TutorDetail,
  TutorPaymentRow,
  TutorPaymentSummaryRow,
} from "./types";

export interface ReportFilters {
  from: string; // yyyy-mm-dd
  to: string;
  branchId?: string;
  tutorName?: string;
  studentName?: string;
}

function qs(filters: ReportFilters) {
  const q = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.branchId) q.set("branchId", filters.branchId);
  if (filters.tutorName) q.set("tutorName", filters.tutorName);
  if (filters.studentName) q.set("studentName", filters.studentName);
  return q.toString();
}

export function useTutorAttendanceReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "attendance", "tutors", filters],
    queryFn: () => api.get<{ rows: TutorAttendanceRow[] }>(`/reports/attendance/tutors?${qs(filters)}`),
    enabled,
  });
}

export function useStudentAttendanceReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "attendance", "students", filters],
    queryFn: () => api.get<{ rows: StudentAttendanceRow[] }>(`/reports/attendance/students?${qs(filters)}`),
    enabled,
  });
}

/** Per-assignment (tutor↔student) rows — used by a tutor's own Earnings/Reports view. */
export function useTutorPaymentsReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "payments", "tutors", filters],
    queryFn: () => api.get<{ rows: TutorPaymentRow[]; summary: { totalPayable: number } }>(`/reports/payments/tutors?${qs(filters)}`),
    enabled,
  });
}

export interface TutorPaymentsSummaryTotals {
  totalPayable: number;
  totalPaid: number;
  totalOutstanding: number;
}

/** Office-facing view — one row per tutor, with real Paid/Outstanding (see reports.service.ts tutorPaymentsSummary). */
export function useTutorPaymentsSummary(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "payments", "tutors", "summary", filters],
    queryFn: () =>
      api.get<{ rows: TutorPaymentSummaryRow[]; summary: TutorPaymentsSummaryTotals; period: string }>(
        `/reports/payments/tutors/summary?${qs(filters)}`,
      ),
    enabled,
  });
}

/** Records a real payout for one tutor for the exact from/to range the report was run with — see reports.service.ts markTutorPaid. */
export function useMarkTutorPaid() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { tutorId: string; from: string; to: string; amount: number }>({
    mutationFn: ({ tutorId, ...body }) => api.post(`/reports/payments/tutors/${tutorId}/pay`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", "payments", "tutors"] }),
  });
}

export interface StudentFeesSummary {
  totalPayable: number;
  totalPaid: number;
  totalBalance: number;
}

export function useStudentFeesReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "fees", "students", filters],
    queryFn: () => api.get<{ rows: StudentFeeRow[]; summary: StudentFeesSummary }>(`/reports/fees/students?${qs(filters)}`),
    enabled,
  });
}

export interface ParentEnquiryFeesSummary {
  totalPrescribed: number;
  totalAgreed: number;
}

/** Prescribed vs. actually agreed fees for every parent enquiry raised in range — see reports.service.ts's parentEnquiryFees. */
export function useParentEnquiryFeesReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "fees", "enquiries", filters],
    queryFn: () => api.get<{ rows: ParentEnquiryFeeRow[]; summary: ParentEnquiryFeesSummary }>(`/reports/fees/enquiries?${qs(filters)}`),
    enabled,
  });
}

/** A row's full detail, on demand — same from/to window as the report itself, so the payable/paid/outstanding here always matches the row that was clicked. See reports.service.ts's tutorDetail. */
export function useTutorDetail(tutorId: string | null, filters: Pick<ReportFilters, "from" | "to">, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "tutors", tutorId, "detail", filters],
    queryFn: () => api.get<TutorDetail>(`/reports/tutors/${tutorId}/detail?from=${filters.from}&to=${filters.to}`),
    enabled: enabled && Boolean(tutorId),
  });
}

/** See reports.service.ts's studentDetail. */
export function useStudentDetail(studentId: string | null, filters: Pick<ReportFilters, "from" | "to">, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "students", studentId, "detail", filters],
    queryFn: () => api.get<StudentDetail>(`/reports/students/${studentId}/detail?from=${filters.from}&to=${filters.to}`),
    enabled: enabled && Boolean(studentId),
  });
}

export function downloadReportCsv(
  kind: "attendance/tutors" | "attendance/students" | "payments/tutors" | "payments/tutors/summary" | "fees/students" | "fees/enquiries",
  filters: ReportFilters,
  filename: string,
) {
  return apiDownload(`/reports/${kind}?${qs(filters)}&format=csv`, filename);
}

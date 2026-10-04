import type { ReactNode } from "react";
import { Modal, DataTable, Badge, Spinner } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useStudentDetail } from "./api";
import type { ReportFilters } from "./api";
import type { StudentDetailAssignmentRow, StudentDetailInvoiceRow } from "./types";

const INVOICE_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "neutral",
  OVERDUE: "danger",
};

/**
 * Opened from a row click on the Reports page's Student Fees/Attendance
 * tables — everything Super Admin (or the owning Branch Admin) would want
 * to know about that one student: profile, attendance for the currently
 * active from/to window, and the student's full fee invoice history.
 */
export function StudentDetailDialog({
  studentId,
  filters,
  onClose,
}: {
  studentId: string | null;
  filters: Pick<ReportFilters, "from" | "to">;
  onClose: () => void;
}) {
  const { data, isLoading } = useStudentDetail(studentId, filters, Boolean(studentId));

  const assignmentColumns: Column<StudentDetailAssignmentRow>[] = [
    { key: "tutorName", header: "Tutor", render: (r) => r.tutorName },
    { key: "subjects", header: "Subjects", render: (r) => r.subjects.join(", ") || "—" },
    { key: "classesAttended", header: "Attended", render: (r) => r.classesAttended },
    { key: "perClassRate", header: "Rate/Class", render: (r) => `₹${r.perClassRate}` },
  ];

  const invoiceColumns: Column<StudentDetailInvoiceRow>[] = [
    { key: "period", header: "Period", render: (r) => r.period },
    { key: "payableFees", header: "Payable", render: (r) => `₹${r.payableFees}` },
    { key: "paidAmount", header: "Paid", render: (r) => <span style={{ color: "var(--color-success-500)" }}>₹{r.paidAmount}</span> },
    {
      key: "balance",
      header: "Outstanding",
      render: (r) => (
        <strong style={{ color: r.balance > 0 ? "var(--color-danger-500)" : "var(--color-success-500)" }}>₹{r.balance}</strong>
      ),
    },
    { key: "status", header: "Status", render: (r) => <Badge tone={INVOICE_STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
  ];

  return (
    <Modal open={Boolean(studentId)} onClose={onClose} title={data?.profile.name ?? "Student details"}>
      {isLoading || !data ? (
        <div style={{ display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
            <Detail label="Branch" value={data.profile.branch.name} />
            <Detail label="Class" value={data.profile.studentClass} />
            <Detail label="Board" value={data.profile.board} />
            <Detail label="Subjects needed" value={data.profile.subjectsNeeded.join(", ") || "—"} />
            <Detail label="Preferred tutor gender" value={data.profile.preferredTutorGender ?? "No preference"} />
            <Detail label="Parent" value={`${data.profile.parent.name} · ${data.profile.parent.contactNumber}`} />
            <Detail
              label="Status"
              value={<Badge tone={data.profile.status === "ACTIVE" ? "success" : "neutral"}>{data.profile.status}</Badge>}
            />
          </div>

          <div>
            <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Fees — full history</h3>
            <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
              <BigStat label="Payable" value={data.fees.summary.totalPayable} />
              <BigStat label="Paid" value={data.fees.summary.totalPaid} tone="success" />
              <BigStat label="Outstanding" value={data.fees.summary.totalBalance} tone={data.fees.summary.totalBalance > 0 ? "danger" : "success"} />
            </div>
            <DataTable
              columns={invoiceColumns}
              rows={data.fees.invoices}
              rowKey={(r) => r.id}
              isLoading={false}
              emptyTitle="No invoices yet"
              emptyDescription="Fee invoices for this student will show up here."
            />
          </div>

          <div>
            <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Attendance · {new Date(data.period.from).toLocaleDateString()} – {new Date(data.period.to).toLocaleDateString()}
            </h3>
            <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
              <BigStat label="Classes Attended" value={data.attendance.classesAttended} plain />
              <BigStat label="Hours" value={data.attendance.totalTimeSpentHours} plain />
            </div>
            {data.attendance.chaptersCompleted && (
              <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Chapters covered: {data.attendance.chaptersCompleted}
              </p>
            )}
            <DataTable
              columns={assignmentColumns}
              rows={data.assignments}
              rowKey={(r) => r.assignmentId}
              isLoading={false}
              emptyTitle="No classes in this period"
              emptyDescription="This student had no scheduled classes in the selected date range."
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function BigStat({
  label,
  value,
  tone,
  plain = false,
}: {
  label: string;
  value: number;
  tone?: "success" | "danger";
  plain?: boolean;
}) {
  const color = tone === "success" ? "var(--color-success-500)" : tone === "danger" ? "var(--color-danger-500)" : undefined;
  return (
    <div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color }}>
        {plain ? value : `₹${value}`}
      </div>
    </div>
  );
}

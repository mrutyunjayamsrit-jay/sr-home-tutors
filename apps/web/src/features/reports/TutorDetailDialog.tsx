import type { ReactNode } from "react";
import { Modal, DataTable, Badge, Spinner } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useTutorDetail } from "./api";
import type { ReportFilters } from "./api";
import type { TutorDetailAssignmentRow } from "./types";

/**
 * Opened from a row click on the Reports page's Tutor Payments/Attendance
 * tables — everything Super Admin (or the owning Branch Admin) would want
 * to know about that one tutor for the currently active from/to window:
 * profile, attendance summary, payable/paid/outstanding, and the
 * per-student breakdown behind those totals.
 */
export function TutorDetailDialog({
  tutorId,
  filters,
  onClose,
}: {
  tutorId: string | null;
  filters: Pick<ReportFilters, "from" | "to">;
  onClose: () => void;
}) {
  const { data, isLoading } = useTutorDetail(tutorId, filters, Boolean(tutorId));

  const columns: Column<TutorDetailAssignmentRow>[] = [
    { key: "studentName", header: "Student", render: (r) => `${r.studentName} (${r.studentClass})` },
    { key: "subjects", header: "Subjects", render: (r) => r.subjects.join(", ") || "—" },
    { key: "classesTaken", header: "Taken", render: (r) => r.classesTaken },
    { key: "classesAbsent", header: "Absent", render: (r) => r.classesAbsent },
    { key: "perClassRate", header: "Rate/Class", render: (r) => `₹${r.perClassRate}` },
    { key: "payableAmount", header: "Payable", render: (r) => `₹${r.payableAmount}` },
  ];

  return (
    <Modal open={Boolean(tutorId)} onClose={onClose} title={data?.profile.name ?? "Tutor details"}>
      {isLoading || !data ? (
        <div style={{ display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
            <Detail label="Branch" value={data.profile.branch.name} />
            <Detail label="Gender" value={data.profile.gender ?? "—"} />
            <Detail label="Education" value={data.profile.education} />
            <Detail label="Contact" value={data.profile.contactNumber} />
            <Detail label="Categories" value={data.profile.categories.join(", ") || "—"} />
            <Detail label="Subjects" value={data.profile.subjects.join(", ") || "—"} />
            <Detail label="Areas" value={data.profile.areas.join(", ") || "—"} />
            <Detail
              label="Status"
              value={<Badge tone={data.profile.status === "ACTIVE" ? "success" : "neutral"}>{data.profile.status}</Badge>}
            />
          </div>

          <div>
            <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Payments · {new Date(data.period.from).toLocaleDateString()} – {new Date(data.period.to).toLocaleDateString()}
            </h3>
            <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
              <BigStat label="Payable" value={data.payments.payableAmount} />
              <BigStat label="Paid" value={data.payments.paidAmount} tone="success" />
              <BigStat
                label="Outstanding"
                value={data.payments.outstandingAmount}
                tone={data.payments.outstandingAmount > 0 ? "danger" : "success"}
              />
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Attendance</h3>
            <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
              <BigStat label="Fixed Classes" value={data.attendance.fixedClasses} plain />
              <BigStat label="Present" value={data.attendance.present} plain />
              <BigStat label="Absent" value={data.attendance.absent} plain />
              <BigStat label="Hours Worked" value={data.attendance.totalHoursWorked} plain />
              {data.attendance.shortClasses > 0 && <BigStat label="Short Classes" value={data.attendance.shortClasses} tone="danger" plain />}
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Students taught this period</h3>
            <DataTable
              columns={columns}
              rows={data.assignments}
              rowKey={(r) => r.assignmentId}
              isLoading={false}
              emptyTitle="No classes in this period"
              emptyDescription="This tutor had no scheduled classes in the selected date range."
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

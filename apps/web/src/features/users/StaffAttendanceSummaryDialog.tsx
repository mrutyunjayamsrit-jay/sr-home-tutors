import { useState } from "react";
import { Modal, DataTable, Spinner, TextField } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useStaffAttendanceSummary } from "@/features/staff-attendance/api";
import type { StaffAttendanceSummary } from "@/features/staff-attendance/types";

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

type RecordRow = StaffAttendanceSummary["records"][number];

/**
 * Users & Roles → click a Branch Office row — real present/absent day
 * counts for that login over a date range (defaults to the current
 * month), derived from StaffAttendance rows rather than any fabricated
 * summary (see staff-attendance.service.ts summaryForUser).
 */
export function StaffAttendanceSummaryDialog({ staffUserId, onClose }: { staffUserId: string | null; onClose: () => void }) {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const { data, isLoading } = useStaffAttendanceSummary(staffUserId, { from, to }, Boolean(staffUserId));

  const columns: Column<RecordRow>[] = [
    { key: "date", header: "Date", render: (r) => new Date(r.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) },
    { key: "loginAt", header: "Check-in", render: (r) => (r.loginAt ? new Date(r.loginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—") },
    { key: "logoutAt", header: "Check-out", render: (r) => (r.logoutAt ? new Date(r.logoutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—") },
  ];

  return (
    <Modal open={Boolean(staffUserId)} onClose={onClose} title={data?.staff.name ?? "Attendance"}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {isLoading || !data ? (
          <div style={{ display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
              <BigStat label="Days Present" value={data.daysPresent} tone="success" />
              <BigStat label="Days Absent" value={data.daysAbsent} tone={data.daysAbsent > 0 ? "danger" : undefined} />
              <BigStat label="Total Days" value={data.totalDays} />
            </div>

            <div>
              <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Check-in/out history
              </h3>
              <DataTable
                columns={columns}
                rows={data.records}
                rowKey={(r) => r.date}
                isLoading={false}
                emptyTitle="No check-ins in this period"
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function BigStat({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "var(--color-success-500)" : tone === "danger" ? "var(--color-danger-500)" : undefined;
  return (
    <div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

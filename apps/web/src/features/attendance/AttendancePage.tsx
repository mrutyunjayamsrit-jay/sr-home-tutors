import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import type { NavItem } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { DataTable, Badge, Select, Button, StatCard } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useSessionsForDate } from "./api";
import { MarkSessionDialog } from "./MarkSessionDialog";
import { CheckInOutDialog } from "./CheckInOutDialog";
import { CheckInOutButton } from "./CheckInOutButton";
import type { ClassSessionRow } from "./types";

const STATUS_TONE: Record<ClassSessionRow["status"], "neutral" | "success" | "danger" | "warning"> = {
  SCHEDULED: "neutral",
  COMPLETED: "success",
  ABSENT_STUDENT: "danger",
  ABSENT_TUTOR: "danger",
  CANCELLED: "warning",
};

const STATUS_FILTER_OPTIONS = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ABSENT_STUDENT", label: "Absent (student)" },
  { value: "ABSENT_TUTOR", label: "Absent (tutor)" },
  { value: "CANCELLED", label: "Cancelled" },
];
const ATTENDANCE_FILTER_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface AttendancePageProps {
  /** Defaults to the Branch Office nav for backward compatibility — pass TUTOR_NAV when mounting this under /tutor. Same component either way: the backend already scopes sessions to "my branch" vs "my classes" by role (see attendance.service.ts). */
  nav?: NavItem[];
  /** A tutor viewing their own attendance doesn't need a "Tutor" column repeating their own name on every row. */
  showTutorColumn?: boolean;
  /** Only a tutor can self-mark by location/area (see attendance.routes.ts) — office roles keep using the row-click manual dialog below. */
  allowTutorMark?: boolean;
  /**
   * Defaults to "Attendance" — the Branch Office route overrides this to
   * "Class Attendance" so it isn't mistaken for the office's own daily
   * check-in/check-out at /branch/my-attendance (a genuinely different
   * feature: this page is every tutor's class-by-class attendance across
   * the branch, that one is the Branch Admin's personal presence).
   */
  title?: string;
}

export function AttendancePage({ nav = BRANCH_NAV, showTutorColumn = true, allowTutorMark = false, title = "Attendance" }: AttendancePageProps) {
  const [date, setDate] = useState(today());
  const [selected, setSelected] = useState<ClassSessionRow | null>(null);
  const [markSession, setMarkSession] = useState<ClassSessionRow | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<"" | "PRESENT" | "ABSENT">("");
  const [statusFilter, setStatusFilter] = useState<"" | ClassSessionRow["status"]>("");
  const { data, isLoading } = useSessionsForDate(date);

  // Both client-side on the day's already-fetched rows — "Attendance" is a
  // quick Present/Absent toggle (COMPLETED vs either ABSENT_* status),
  // "Status" is the exact per-row status shown in the table's own column.
  const rows = (data ?? []).filter((s) => {
    if (attendanceFilter === "PRESENT" && s.status !== "COMPLETED") return false;
    if (attendanceFilter === "ABSENT" && s.status !== "ABSENT_STUDENT" && s.status !== "ABSENT_TUTOR") return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });
  const hasActiveFilters = Boolean(attendanceFilter || statusFilter);

  // Totals for the whole day, regardless of the filters above — the point
  // of a summary is to show what's there even while the table itself is
  // narrowed down to a slice of it.
  const totalPresent = (data ?? []).filter((s) => s.status === "COMPLETED").length;
  const totalAbsent = (data ?? []).filter((s) => s.status === "ABSENT_STUDENT" || s.status === "ABSENT_TUTOR").length;

  const columns: Column<ClassSessionRow>[] = [
    { key: "time", header: "Time", render: (s) => new Date(s.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    { key: "student", header: "Student", render: (s) => `${s.assignment.student.name} (${s.assignment.student.studentClass})` },
    ...(showTutorColumn ? [{ key: "tutor", header: "Tutor", render: (s: ClassSessionRow) => s.assignment.tutor.name } as Column<ClassSessionRow>] : []),
    { key: "subjects", header: "Subjects", render: (s) => s.assignment.subjects.join(", ") },
    { key: "status", header: "Status", render: (s) => <Badge tone={STATUS_TONE[s.status]}>{s.status.replace("_", " ")}</Badge> },
    {
      key: "hours",
      header: "Hours",
      render: (s) => {
        if (s.actualDurationMinutes == null) return "—";
        // Short relative to THIS assignment's own scheduled length, not a
        // flat global floor — a 30-minute assignment running 25 minutes is
        // short for that student even if it'd clear a blanket bar.
        const isShort = s.status === "COMPLETED" && s.actualDurationMinutes < s.assignment.classDurationMinutes;
        return (
          <span
            style={isShort ? { color: "var(--color-danger-500)", fontWeight: 700 } : undefined}
            title={isShort ? `Scheduled for ${(s.assignment.classDurationMinutes / 60).toFixed(2)}h` : undefined}
          >
            {(s.actualDurationMinutes / 60).toFixed(2)}
            {isShort && " ⚠"}
          </span>
        );
      },
    },
    ...(allowTutorMark
      ? [
          {
            key: "mark",
            header: "",
            render: (s: ClassSessionRow) => {
              if (s.status !== "SCHEDULED") return null;
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <CheckInOutButton session={s} onClick={() => setMarkSession(s)} />
                </div>
              );
            },
          } as Column<ClassSessionRow>,
        ]
      : []),
  ];

  return (
    <AppShell nav={nav}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          {allowTutorMark
            ? "Check in when you arrive at the student's home and check out when the class ends — or enter your area if location isn't available. Click a row for manual options."
            : "Mark each class as it happens. Click a row to record attendance."}
        </p>

        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          <div style={{ width: 220 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  height: 42,
                  padding: "0 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-strong)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                }}
              />
            </label>
          </div>
          <div style={{ width: 160 }}>
            <Select
              label="Attendance"
              placeholder="All"
              options={ATTENDANCE_FILTER_OPTIONS}
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as "" | "PRESENT" | "ABSENT")}
            />
          </div>
          <div style={{ width: 180 }}>
            <Select
              label="Status"
              placeholder="All"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | ClassSessionRow["status"])}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              variant="ghost"
              onClick={() => {
                setAttendanceFilter("");
                setStatusFilter("");
              }}
              disabled={!hasActiveFilters}
            >
              Clear all filters
            </Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", maxWidth: 420, marginBottom: "var(--space-4)" }}>
          <StatCard label="Present" value={totalPresent} loading={isLoading} />
          <StatCard label="Absent" value={totalAbsent} loading={isLoading} />
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          emptyTitle="No classes scheduled for this date"
          emptyDescription="Classes appear here automatically once a tutor is assigned with a weekly schedule."
          onRowClick={setSelected}
        />
      </div>

      <MarkSessionDialog session={selected} onClose={() => setSelected(null)} />
      {allowTutorMark && <CheckInOutDialog session={markSession} onClose={() => setMarkSession(null)} />}
    </AppShell>
  );
}

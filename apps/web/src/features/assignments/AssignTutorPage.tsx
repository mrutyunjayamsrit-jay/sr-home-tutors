import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useAssignments, useRunningClasses, useUpdateAssignmentStatus } from "./api";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";
import type { Assignment, RunningClassRow } from "./types";
import styles from "@/features/reports/ReportsPage.module.css";

type Tab = "assignments" | "running";

const STATUS_TONE: Record<Assignment["status"], "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  ENDED: "neutral",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AssignTutorPage() {
  const [tab, setTab] = useState<Tab>("assignments");
  const [createOpen, setCreateOpen] = useState(false);

  const assignments = useAssignments({ page: 1, pageSize: 50 });
  const running = useRunningClasses();
  const updateStatus = useUpdateAssignmentStatus();

  const handleStatusChange = async (id: string, status: "ACTIVE" | "PAUSED" | "ENDED") => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Assignment ${status === "ENDED" ? "ended" : status.toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update assignment");
    }
  };

  const assignmentColumns: Column<Assignment>[] = [
    { key: "student", header: "Student", render: (a) => `${a.student.name} (${a.student.studentClass})` },
    { key: "tutor", header: "Tutor", render: (a) => a.tutor.name },
    { key: "subjects", header: "Subjects", render: (a) => a.subjects.join(", ") },
    { key: "schedule", header: "Schedule", render: (a) => `${a.daysOfWeek.map((d) => DAY_LABELS[d]).join("/")} · ${a.timeSlotStart}–${a.timeSlotEnd}` },
    { key: "rate", header: "Rate/class", render: (a) => `₹${a.perClassRate}` },
    { key: "status", header: "Status", render: (a) => <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge> },
    {
      key: "actions",
      header: "",
      render: (a) =>
        a.status === "ACTIVE" ? (
          <div style={{ display: "flex", gap: "6px" }}>
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleStatusChange(a.id, "PAUSED"); }}>
              Pause
            </Button>
            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleStatusChange(a.id, "ENDED"); }}>
              End
            </Button>
          </div>
        ) : a.status === "PAUSED" ? (
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleStatusChange(a.id, "ACTIVE"); }}>
            Resume
          </Button>
        ) : null,
    },
  ];

  const runningColumns: Column<RunningClassRow>[] = [
    { key: "student", header: "Student", render: (r) => r.studentName },
    { key: "tutor", header: "Tutor", render: (r) => r.tutorName },
    { key: "fixed", header: "Fixed/month", render: (r) => r.fixedClassesPerMonth },
    { key: "attended", header: "Attended", render: (r) => r.attended },
    { key: "absent", header: "Absent", render: (r) => r.absent },
    { key: "remaining", header: "Remaining", render: (r) => r.remaining },
    {
      key: "pct",
      header: "Attendance %",
      render: (r) => (
        <span style={{ color: r.attendancePercent >= 75 ? "var(--color-success-500)" : r.attendancePercent >= 50 ? "var(--color-warning-500)" : "var(--color-danger-500)" }}>
          {r.attendancePercent}%
        </span>
      ),
    },
  ];

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Assign Tutor</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>Match tutors to students and track running classes.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ Assign a tutor</Button>
        </div>

        <div className={styles.tabs}>
          <button className={[styles.tab, tab === "assignments" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("assignments")} type="button">
            Assignments
          </button>
          <button className={[styles.tab, tab === "running" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("running")} type="button">
            Running Classes
          </button>
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          {tab === "assignments" ? (
            <DataTable
              columns={assignmentColumns}
              rows={assignments.data?.data ?? []}
              rowKey={(a) => a.id}
              isLoading={assignments.isLoading}
              emptyTitle="No assignments yet"
              emptyDescription="Assign a registered tutor to a registered student to get started."
            />
          ) : (
            <DataTable
              columns={runningColumns}
              rows={running.data ?? []}
              rowKey={(r) => r.id}
              isLoading={running.isLoading}
              emptyTitle="No running classes yet"
              emptyDescription="Once a tutor is assigned, their class schedule and attendance stats appear here."
            />
          )}
        </div>
      </div>

      <CreateAssignmentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, Select, TextField, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useAssignments, useRunningClasses, useUpdateAssignmentStatus } from "./api";
import { useSubjects } from "@/features/master-data/api";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";
import type { Assignment, RunningClassRow } from "./types";
import styles from "@/features/reports/ReportsPage.module.css";

type Tab = "assignments" | "running";

const STATUS_TONE: Record<Assignment["status"], "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  ENDED: "neutral",
};

const STATUS_FILTER_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ENDED", label: "Ended" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AssignTutorPage() {
  const [tab, setTab] = useState<Tab>("assignments");
  const [createOpen, setCreateOpen] = useState(false);

  // Assignments-tab filters — mirror that table's own columns.
  const [studentName, setStudentName] = useState("");
  const [tutorName, setTutorName] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<"" | Assignment["status"]>("");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");

  // Running Classes-tab filters.
  const [runningStudentName, setRunningStudentName] = useState("");
  const [runningTutorName, setRunningTutorName] = useState("");

  const subjects = useSubjects();
  const subjectFilterOptions = (subjects.data ?? []).map((s) => ({ value: s.name, label: s.name }));

  const assignments = useAssignments({
    page: 1,
    pageSize: 50,
    studentName: studentName || undefined,
    tutorName: tutorName || undefined,
    subject: subject || undefined,
    status: status || undefined,
    from: startFrom || undefined,
    to: startTo || undefined,
  });
  const running = useRunningClasses({ studentName: runningStudentName || undefined, tutorName: runningTutorName || undefined });
  const updateStatus = useUpdateAssignmentStatus();

  const hasActiveAssignmentFilters = Boolean(studentName || tutorName || subject || status || startFrom || startTo);
  const handleClearAssignmentFilters = () => {
    setStudentName("");
    setTutorName("");
    setSubject("");
    setStatus("");
    setStartFrom("");
    setStartTo("");
  };

  const hasActiveRunningFilters = Boolean(runningStudentName || runningTutorName);
  const handleClearRunningFilters = () => {
    setRunningStudentName("");
    setRunningTutorName("");
  };

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
    { key: "startDate", header: "Class Start Date", render: (a) => new Date(a.startDate).toLocaleDateString() },
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
            <>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                <div style={{ width: 180 }}>
                  <TextField label="Student" placeholder="Search student" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                </div>
                <div style={{ width: 180 }}>
                  <TextField label="Tutor" placeholder="Search tutor" value={tutorName} onChange={(e) => setTutorName(e.target.value)} />
                </div>
                <div style={{ width: 180 }}>
                  <Select label="Subjects" placeholder="All" options={subjectFilterOptions} value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div style={{ width: 160 }}>
                  <Select
                    label="Status"
                    placeholder="All"
                    options={STATUS_FILTER_OPTIONS}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "" | Assignment["status"])}
                  />
                </div>
                <div style={{ width: 170 }}>
                  <TextField label="Start date from" type="date" value={startFrom} onChange={(e) => setStartFrom(e.target.value)} />
                </div>
                <div style={{ width: 170 }}>
                  <TextField label="Start date to" type="date" value={startTo} onChange={(e) => setStartTo(e.target.value)} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <Button variant="ghost" onClick={handleClearAssignmentFilters} disabled={!hasActiveAssignmentFilters}>
                    Clear all filters
                  </Button>
                </div>
              </div>
              <DataTable
                columns={assignmentColumns}
                rows={assignments.data?.data ?? []}
                rowKey={(a) => a.id}
                isLoading={assignments.isLoading}
                emptyTitle="No assignments yet"
                emptyDescription="Assign a registered tutor to a registered student to get started."
              />
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                <div style={{ width: 180 }}>
                  <TextField label="Student" placeholder="Search student" value={runningStudentName} onChange={(e) => setRunningStudentName(e.target.value)} />
                </div>
                <div style={{ width: 180 }}>
                  <TextField label="Tutor" placeholder="Search tutor" value={runningTutorName} onChange={(e) => setRunningTutorName(e.target.value)} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <Button variant="ghost" onClick={handleClearRunningFilters} disabled={!hasActiveRunningFilters}>
                    Clear all filters
                  </Button>
                </div>
              </div>
              <DataTable
                columns={runningColumns}
                rows={running.data ?? []}
                rowKey={(r) => r.id}
                isLoading={running.isLoading}
                emptyTitle="No running classes yet"
                emptyDescription="Once a tutor is assigned, their class schedule and attendance stats appear here."
              />
            </>
          )}
        </div>
      </div>

      <CreateAssignmentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

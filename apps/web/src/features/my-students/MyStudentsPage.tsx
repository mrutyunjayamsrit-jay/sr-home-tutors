import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { DataTable, Badge } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useAssignments, useRunningClasses } from "@/features/assignments/api";
import type { Assignment } from "@/features/assignments/types";
import { StudentDetailModal } from "./StudentDetailModal";

type EnrichedAssignment = Assignment & { attended?: number; absent?: number; remaining?: number; attendancePercent?: number };

export function MyStudentsPage() {
  const [selected, setSelected] = useState<EnrichedAssignment | null>(null);
  const assignments = useAssignments({ page: 1, pageSize: 100 });
  const running = useRunningClasses();

  const rows: EnrichedAssignment[] = (assignments.data?.data ?? []).map((a) => {
    const stats = running.data?.find((r) => r.id === a.id);
    return { ...a, attended: stats?.attended, absent: stats?.absent, remaining: stats?.remaining, attendancePercent: stats?.attendancePercent };
  });

  const columns: Column<EnrichedAssignment>[] = [
    { key: "name", header: "Student", render: (a) => <strong>{a.student.name}</strong> },
    { key: "class", header: "Class", render: (a) => a.student.studentClass },
    { key: "subjects", header: "Subjects", render: (a) => a.subjects.join(", ") },
    {
      key: "attendance",
      header: "Attendance",
      render: (a) =>
        a.attendancePercent !== undefined ? (
          <span style={{ color: a.attendancePercent >= 75 ? "var(--color-success-500)" : a.attendancePercent >= 50 ? "var(--color-warning-500)" : "var(--color-danger-500)" }}>
            {a.attendancePercent}%
          </span>
        ) : (
          "—"
        ),
    },
    { key: "status", header: "Status", render: (a) => <Badge tone={a.status === "ACTIVE" ? "success" : "neutral"}>{a.status}</Badge> },
  ];

  return (
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>My Students</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          Everyone assigned to you. Click a student for their full profile, attendance, and progress notes.
        </p>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          isLoading={assignments.isLoading}
          emptyTitle="No students assigned yet"
          emptyDescription="Once your branch office assigns you a student, they'll show up here."
          onRowClick={setSelected}
        />
      </div>

      <StudentDetailModal assignment={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}

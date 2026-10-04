import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { Button, DataTable, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useTestResults, useDeleteTestResult } from "./api";
import { CreateTestDialog } from "./CreateTestDialog";
import type { TestResult } from "./types";

export function TestsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useTestResults();
  const deleteTest = useDeleteTestResult();

  const handleDelete = async (id: string) => {
    try {
      await deleteTest.mutateAsync(id);
      toast.success("Test result removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove test result");
    }
  };

  const columns: Column<TestResult>[] = [
    { key: "date", header: "Date", render: (t) => new Date(t.testDate).toLocaleDateString() },
    { key: "student", header: "Student", render: (t) => (t.assignment ? `${t.assignment.student.name} (${t.assignment.student.studentClass})` : "—") },
    { key: "subject", header: "Subject", render: (t) => t.subject },
    { key: "topic", header: "Topic", render: (t) => t.topic },
    {
      key: "marks",
      header: "Marks",
      render: (t) => {
        const pct = t.totalMarks > 0 ? Math.round((t.obtainedMarks / t.totalMarks) * 100) : 0;
        return (
          <span>
            {t.obtainedMarks} / {t.totalMarks}{" "}
            <Badge tone={pct >= 75 ? "success" : pct >= 40 ? "warning" : "danger"}>{pct}%</Badge>
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Tests & Marks</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>Record test results for your students.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ New test result</Button>
        </div>

        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(t) => t.id}
          isLoading={isLoading}
          emptyTitle="No test results yet"
          emptyDescription="Add a test result after each test to build up each student's academic record."
        />
      </div>

      <CreateTestDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, Select, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useTasks, useCompleteTask } from "./api";
import type { Task, TaskStatus } from "./types";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
];

function isOverdue(task: Task) {
  return task.status === "PENDING" && Boolean(task.dueDate) && new Date(task.dueDate!) < new Date(new Date().toDateString());
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Tasks Super Admin has assigned to this branch — see TasksPage.tsx for the Super Admin's org-wide equivalent. */
export function BranchTasksPage() {
  const [status, setStatus] = useState<TaskStatus | "">("");
  const tasks = useTasks({ status: status || undefined, pageSize: 100 });
  const completeTask = useCompleteTask();

  const handleComplete = async (task: Task) => {
    try {
      await completeTask.mutateAsync(task.id);
      toast.success(`"${task.title}" marked complete`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update task");
    }
  };

  const columns: Column<Task>[] = [
    { key: "title", header: "Task", render: (t) => <strong>{t.title}</strong> },
    { key: "description", header: "Description", render: (t) => t.description ?? "—" },
    {
      key: "dueDate",
      header: "Due",
      render: (t) => (
        <span style={{ color: isOverdue(t) ? "var(--color-danger-500)" : undefined, fontWeight: isOverdue(t) ? 700 : 400 }}>
          {formatDate(t.dueDate)}
          {isOverdue(t) && " (overdue)"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) =>
        t.status === "COMPLETED" ? (
          <Badge tone="success">Completed</Badge>
        ) : isOverdue(t) ? (
          <Badge tone="danger">Overdue</Badge>
        ) : (
          <Badge tone="warning">Pending</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (t) =>
        t.status === "PENDING" ? (
          <Button
            size="sm"
            variant="secondary"
            loading={completeTask.isPending}
            onClick={(e) => {
              e.stopPropagation();
              handleComplete(t);
            }}
          >
            Mark complete
          </Button>
        ) : null,
    },
  ];

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          Tasks assigned to your branch by Super Admin.
        </p>

        <div style={{ maxWidth: 220, marginBottom: "var(--space-4)" }}>
          <Select
            label="Status"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
          />
        </div>

        <DataTable
          columns={columns}
          rows={tasks.data?.data ?? []}
          rowKey={(t) => t.id}
          isLoading={tasks.isLoading}
          emptyTitle="No tasks yet"
          emptyDescription="Tasks Super Admin assigns to your branch show up here."
        />
      </div>
    </AppShell>
  );
}

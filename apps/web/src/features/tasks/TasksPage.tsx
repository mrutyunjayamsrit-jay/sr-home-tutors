import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV } from "@/app/navConfig";
import { Button, DataTable, Select, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useTasks, useCompleteTask, useDeleteTask } from "./api";
import { useBranches } from "@/features/branches/api";
import { CreateTaskDialog } from "./CreateTaskDialog";
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

/**
 * Super Admin's task-assignment page — every task, across every branch,
 * with its live completion status. A Branch Admin sees their own subset of
 * this same data on their dashboard and /branch/tasks (see BranchTasksPage).
 */
export function TasksPage() {
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: branches } = useBranches({ page: 1, pageSize: 100 });
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const tasks = useTasks({ branchId: branchId || undefined, status: status || undefined, pageSize: 100 });
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  const handleComplete = async (task: Task) => {
    try {
      await completeTask.mutateAsync(task.id);
      toast.success(`"${task.title}" marked complete`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update task");
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success(`"${task.title}" removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove task");
    }
  };

  const columns: Column<Task>[] = [
    { key: "branch", header: "Branch", render: (t) => t.branch?.name ?? "—" },
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
      render: (t) => (
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          {t.status === "PENDING" && (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleComplete(t); }}>
              Mark complete
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(t); }}>
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell nav={ADMIN_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Tasks</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              Assign tasks to a branch and track completion, live.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ Assign task</Button>
        </div>

        <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <Select label="Branch" placeholder="All branches" options={branchOptions} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          </div>
          <div style={{ minWidth: 180 }}>
            <Select
              label="Status"
              placeholder="All statuses"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={tasks.data?.data ?? []}
          rowKey={(t) => t.id}
          isLoading={tasks.isLoading}
          emptyTitle="No tasks yet"
          emptyDescription="Assign a task to a branch to start tracking it here."
        />
      </div>

      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

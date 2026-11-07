import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, Select, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useTasks, useCompleteTask, useDeleteTask } from "./api";
import { useAuthStore } from "@/features/auth/authStore";
import { CreateTaskDialog } from "./CreateTaskDialog";
import type { Task, TaskStatus } from "./types";
import styles from "@/features/reports/ReportsPage.module.css";

type Tab = "fromSuperAdmin" | "toSuperAdmin";

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
 * Tasks for this branch, both directions: what Super Admin assigned here
 * (the original, office-facing use case), and what this branch has raised
 * for Super Admin's attention (see TasksPage.tsx for Super Admin's
 * org-wide equivalent of both).
 */
export function BranchTasksPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("fromSuperAdmin");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const tasks = useTasks({
    status: status || undefined,
    pageSize: 100,
    direction: tab === "fromSuperAdmin" ? "TO_BRANCH" : "TO_SUPER_ADMIN",
  });
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
      toast.success(`"${task.title}" withdrawn`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not withdraw task");
    }
  };

  const columns: Column<Task>[] = [
    { key: "title", header: "Task", render: (t) => <strong>{t.title}</strong> },
    { key: "description", header: "Description", render: (t) => t.description ?? "—" },
    { key: "createdAt", header: "Created", render: (t) => formatDate(t.createdAt) },
    { key: "assignedDate", header: "Assigned", render: (t) => formatDate(t.assignedDate) },
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
        tab === "fromSuperAdmin" ? (
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
          ) : null
        ) : t.status === "PENDING" && t.createdById === user?.id ? (
          <Button
            size="sm"
            variant="ghost"
            loading={deleteTask.isPending}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(t);
            }}
          >
            Withdraw
          </Button>
        ) : null,
    },
  ];

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Tasks</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>Tasks between your branch and Super Admin.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ New task for Super Admin</Button>
        </div>

        <div className={styles.tabs}>
          <button className={[styles.tab, tab === "fromSuperAdmin" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("fromSuperAdmin")} type="button">
            From Super Admin
          </button>
          <button className={[styles.tab, tab === "toSuperAdmin" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("toSuperAdmin")} type="button">
            Sent to Super Admin
          </button>
        </div>

        <div style={{ maxWidth: 220, margin: "var(--space-4) 0" }}>
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
          emptyDescription={
            tab === "fromSuperAdmin" ? "Tasks Super Admin assigns to your branch show up here." : "Tasks you raise for Super Admin show up here."
          }
        />
      </div>

      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

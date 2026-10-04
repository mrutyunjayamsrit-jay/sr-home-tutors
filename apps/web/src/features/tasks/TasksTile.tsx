import { Link } from "react-router-dom";
import { Card, Button, Badge, toast } from "@/components/ui";
import { useTasks, useCompleteTask } from "./api";
import type { Task } from "./types";

function isOverdue(task: Task) {
  return task.status === "PENDING" && Boolean(task.dueDate) && new Date(task.dueDate!) < new Date(new Date().toDateString());
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Compact "tasks assigned to us" shortcut for the Branch Admin dashboard —
 * mirrors AttendanceTile.tsx's pattern (a quick-action summary here, the
 * full list with a status filter at /branch/tasks).
 */
export function TasksTile() {
  const pending = useTasks({ status: "PENDING", pageSize: 5 });
  const completeTask = useCompleteTask();

  const handleComplete = async (task: Task) => {
    try {
      await completeTask.mutateAsync(task.id);
      toast.success(`"${task.title}" marked complete`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update task");
    }
  };

  const tasks = pending.data?.data ?? [];
  const totalPending = pending.data?.meta?.total ?? tasks.length;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Tasks from Super Admin</h2>
        {totalPending > 0 && <Badge tone="warning">{totalPending} pending</Badge>}
      </div>

      {!pending.isLoading && tasks.length === 0 && (
        <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: 0 }}>No pending tasks — you're all caught up.</p>
      )}

      {tasks.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) 0",
            borderTop: "1px solid var(--border-default)",
          }}
        >
          <div>
            <strong style={{ fontSize: "var(--text-sm)" }}>{t.title}</strong>
            {t.dueDate && (
              <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: isOverdue(t) ? "var(--color-danger-500)" : "var(--text-tertiary)" }}>
                Due {formatDate(t.dueDate)}
                {isOverdue(t) && " · overdue"}
              </p>
            )}
          </div>
          <Button size="sm" variant="secondary" loading={completeTask.isPending} onClick={() => handleComplete(t)}>
            Mark complete
          </Button>
        </div>
      ))}

      <div style={{ marginTop: "var(--space-4)" }}>
        <Link to="/branch/tasks" style={{ fontSize: "var(--text-sm)" }}>
          View all tasks →
        </Link>
      </div>
    </Card>
  );
}

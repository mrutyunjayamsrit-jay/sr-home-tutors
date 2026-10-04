import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV, BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, Select, Badge } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useAuthStore } from "@/features/auth/authStore";
import { useParentQueries } from "./api";
import { AnswerQueryDialog } from "./AnswerQueryDialog";
import type { ParentQuery, QueryStatus } from "./types";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Awaiting reply" },
  { value: "ANSWERED", label: "Answered" },
];

const TARGET_LABEL: Record<ParentQuery["target"], string> = {
  BRANCH: "Branch office",
  SUPER_ADMIN: "Super Admin",
};

/**
 * Shared by Branch Admin (/branch/queries, own branch's BRANCH-targeted
 * queries only) and Super Admin (/admin/queries, everything) — see
 * parent-queries.service.ts for the exact scoping. Answering notifies the
 * parent who asked (notifyParentQueryAnswered).
 */
export function QueriesInboxPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [status, setStatus] = useState<QueryStatus | "">("");
  const [answering, setAnswering] = useState<ParentQuery | null>(null);

  const { data, isLoading } = useParentQueries({ status: status || undefined, pageSize: 100 });
  const items = data?.data ?? [];

  const columns: Column<ParentQuery>[] = [
    ...(isSuperAdmin ? [{ key: "branch", header: "Branch", render: (q: ParentQuery) => q.branch?.name ?? "—" } as Column<ParentQuery>] : []),
    { key: "subject", header: "Subject", render: (q) => <strong>{q.subject}</strong> },
    {
      key: "askedBy",
      header: "Asked by",
      render: (q) => (q.askedBy ? `${q.askedBy.name} · ${q.askedBy.contactNumber}` : "—"),
    },
    { key: "target", header: "Addressed to", render: (q) => TARGET_LABEL[q.target] },
    {
      key: "status",
      header: "Status",
      render: (q) => (q.status === "ANSWERED" ? <Badge tone="success">Answered</Badge> : <Badge tone="warning">Awaiting reply</Badge>),
    },
    {
      key: "createdAt",
      header: "Asked",
      render: (q) => new Date(q.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
    },
    {
      key: "actions",
      header: "",
      render: (q) =>
        q.status === "OPEN" ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setAnswering(q);
            }}
          >
            Answer
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setAnswering(q);
            }}
          >
            View reply
          </Button>
        ),
    },
  ];

  return (
    <AppShell nav={isSuperAdmin ? ADMIN_NAV : BRANCH_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Parent Queries</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          {isSuperAdmin
            ? "Questions parents have sent to their branch office or straight to you."
            : "Questions parents at your branch have sent to your office."}
        </p>

        <div style={{ maxWidth: 220, marginBottom: "var(--space-4)" }}>
          <Select
            label="Status"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as QueryStatus | "")}
          />
        </div>

        <DataTable
          columns={columns}
          rows={items}
          rowKey={(q) => q.id}
          isLoading={isLoading}
          onRowClick={(q) => setAnswering(q)}
          emptyTitle="No queries yet"
          emptyDescription="Questions parents send will show up here."
        />
      </div>

      <AnswerQueryDialog query={answering} onClose={() => setAnswering(null)} />
    </AppShell>
  );
}

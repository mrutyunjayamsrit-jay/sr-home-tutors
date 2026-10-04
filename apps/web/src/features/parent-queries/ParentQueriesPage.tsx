import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { PARENT_NAV } from "@/app/navConfig";
import { Button, Card, Badge, Spinner, EmptyState } from "@/components/ui";
import { useParentQueries } from "./api";
import { AskQueryDialog } from "./AskQueryDialog";
import type { ParentQuery } from "./types";

const TARGET_LABEL: Record<ParentQuery["target"], string> = {
  BRANCH: "Branch office",
  SUPER_ADMIN: "Super Admin",
};

/**
 * A parent asks a question addressed either to their own branch office or
 * straight to Super Admin — both are notified the moment it's sent (see
 * notifications.service.ts's notifyParentQueryToBranch/ToSuperAdmin), and
 * the reply, once given, shows up right here (notifyParentQueryAnswered).
 */
export function ParentQueriesPage() {
  const [askOpen, setAskOpen] = useState(false);
  const { data, isLoading } = useParentQueries({ page: 1, pageSize: 50 });
  const items = data?.data ?? [];

  return (
    <AppShell nav={PARENT_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Ask a Question</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              Send a question to your branch office or straight to Super Admin — you'll see the reply here.
            </p>
          </div>
          <Button onClick={() => setAskOpen(true)}>+ Ask a question</Button>
        </div>

        {isLoading ? (
          <Spinner size="lg" />
        ) : items.length === 0 ? (
          <EmptyState title="No questions yet" description="Questions you send will show up here with the reply, once answered." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {items.map((q) => (
              <Card key={q.id}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
                  <strong>{q.subject}</strong>
                  <Badge tone="neutral">{TARGET_LABEL[q.target]}</Badge>
                  {q.status === "ANSWERED" ? <Badge tone="success">Answered</Badge> : <Badge tone="warning">Awaiting reply</Badge>}
                </div>
                <p style={{ margin: "4px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{q.message}</p>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{new Date(q.createdAt).toLocaleString()}</span>

                {q.status === "ANSWERED" && q.answer && (
                  <div
                    style={{
                      marginTop: "var(--space-3)",
                      padding: "var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-subtle, #f8fafc)",
                      border: "1px solid var(--border-subtle, #e2e8f0)",
                    }}
                  >
                    <strong style={{ fontSize: "var(--text-sm)" }}>Reply</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", whiteSpace: "pre-wrap" }}>{q.answer}</p>
                    {q.answeredAt && (
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{new Date(q.answeredAt).toLocaleString()}</span>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <AskQueryDialog open={askOpen} onClose={() => setAskOpen(false)} />
    </AppShell>
  );
}

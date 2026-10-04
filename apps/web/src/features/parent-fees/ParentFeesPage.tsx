import { AppShell } from "@/app/AppShell";
import { PARENT_NAV } from "@/app/navConfig";
import { Card, Badge, Spinner, EmptyState } from "@/components/ui";
import { useSelectedChild } from "@/features/family/useSelectedChild";
import { ChildSwitcher } from "@/features/family/ChildSwitcher";
import { useInvoices } from "@/features/fees/api";
import type { StudentFeeInvoice } from "@/features/fees/types";
import styles from "./ParentFeesPage.module.css";

const STATUS_TONE: Record<StudentFeeInvoice["status"], "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "neutral",
  OVERDUE: "danger",
};

const STATUS_LABEL: Record<StudentFeeInvoice["status"], string> = {
  PAID: "Paid in full",
  PARTIAL: "Partially paid",
  PENDING: "Payment due",
  OVERDUE: "Overdue",
};

function formatMonth(period: string) {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function ParentFeesPage() {
  const { children, selectedChildId, selectChild, isLoading: childrenLoading } = useSelectedChild();
  const invoices = useInvoices({ studentId: selectedChildId, page: 1, pageSize: 50 });

  const rows = [...(invoices.data?.data ?? [])].sort((a, b) => b.period.localeCompare(a.period));
  const outstanding = rows.filter((i) => i.status !== "PAID").reduce((sum, i) => sum + Number(i.balance), 0);

  if (childrenLoading) {
    return (
      <AppShell nav={PARENT_NAV}>
        <div className="page-inner">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (children.length === 0) {
    return (
      <AppShell nav={PARENT_NAV}>
        <div className="page-inner">
          <EmptyState title="No children on file yet" description="Fee invoices will appear here once your child is registered." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={PARENT_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Fees</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          Monthly invoices and payment status. For payments, please reach out to the branch office.
        </p>

        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={selectChild} />

        {outstanding > 0 && !invoices.isLoading && (
          <Card style={{ marginBottom: "var(--space-4)", background: "var(--color-warning-100)", border: "1px solid var(--color-warning-500)" }}>
            <strong>₹{outstanding.toLocaleString("en-IN")}</strong> outstanding across all invoices.
          </Card>
        )}

        {invoices.isLoading ? (
          <Spinner size="lg" />
        ) : rows.length === 0 ? (
          <EmptyState title="No invoices yet" description="Fee invoices raised by the branch office will appear here." />
        ) : (
          <div className={styles.grid}>
            {rows.map((inv) => {
              const paidPct = Math.min(100, Math.round((Number(inv.paidAmount) / Number(inv.payableFees)) * 100));
              return (
                <Card key={inv.id} className={styles.invoiceCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className={styles.period}>{formatMonth(inv.period)}</h3>
                    <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                  </div>

                  <div className={styles.amountRow}>
                    <div>
                      <div className={styles.amount}>₹{Number(inv.payableFees).toLocaleString("en-IN")}</div>
                      <div className={styles.subLabel}>Total for {inv.fixedClasses} classes</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className={styles.amount} style={{ color: Number(inv.balance) > 0 ? "var(--color-danger-500)" : "var(--color-success-500)" }}>
                        ₹{Number(inv.balance).toLocaleString("en-IN")}
                      </div>
                      <div className={styles.subLabel}>Balance</div>
                    </div>
                  </div>

                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${paidPct}%` }} />
                  </div>

                  <div className={styles.meta}>
                    <span>{inv.classesTaken} of {inv.fixedClasses} classes taken</span>
                    <span>Due {new Date(inv.dueDate).toLocaleDateString()}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

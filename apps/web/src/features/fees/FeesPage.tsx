import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import type { NavItem } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, Badge, Alert, Select } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useRateCards, useInvoices } from "./api";
import { useBranches } from "@/features/branches/api";
import { useAuthStore } from "@/features/auth/authStore";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { ViewDocumentsDialog } from "@/features/documents/ViewDocumentsDialog";
import type { DocumentsTarget } from "@/features/documents/ViewDocumentsDialog";
import type { FeeRateCard, StudentFeeInvoice } from "./types";
import styles from "@/features/reports/ReportsPage.module.css";

type Tab = "rateCards" | "invoices";

interface FeesPageProps {
  /** Defaults to the Branch Office nav — pass ADMIN_NAV when mounting this under /admin. Same component either way: Super Admin gets a branch filter/column the office view doesn't need. */
  nav?: NavItem[];
}

const STATUS_TONE: Record<StudentFeeInvoice["status"], "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "neutral",
  OVERDUE: "danger",
};

export function FeesPage({ nav = BRANCH_NAV }: FeesPageProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [tab, setTab] = useState<Tab>("rateCards");
  const [branchId, setBranchId] = useState("");
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<StudentFeeInvoice | null>(null);
  const [proofTarget, setProofTarget] = useState<DocumentsTarget | null>(null);

  const { data: branches } = useBranches({ page: 1, pageSize: 100 }, isSuperAdmin);
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  // Rate cards are read-only here — Super Admin sets pricing (see
  // fees.routes.ts rateCardWriteAccess); a branch office just needs to see
  // the current rates while raising an invoice below.
  const rateCards = useRateCards(isSuperAdmin ? { branchId: branchId || undefined } : {});
  const invoices = useInvoices({ page: 1, pageSize: 50, branchId: isSuperAdmin ? branchId || undefined : undefined });

  const rateCardColumns: Column<FeeRateCard>[] = [
    ...(isSuperAdmin ? [{ key: "branch", header: "Branch", render: (r: FeeRateCard) => r.branch?.name ?? "—" } as Column<FeeRateCard>] : []),
    { key: "board", header: "Board", render: (r) => r.board },
    { key: "category", header: "Class category", render: (r) => r.classCategory },
    { key: "rate", header: "Rate/class", render: (r) => `₹${r.ratePerClass}` },
    { key: "cycle", header: "Billing cycle", render: (r) => r.billingCycle },
  ];

  const invoiceColumns: Column<StudentFeeInvoice>[] = [
    { key: "student", header: "Student", render: (i) => `${i.student.name} (${i.student.studentClass})` },
    ...(isSuperAdmin ? [{ key: "branch", header: "Branch", render: (i: StudentFeeInvoice) => i.student.parent.branch?.name ?? "—" } as Column<StudentFeeInvoice>] : []),
    { key: "period", header: "Period", render: (i) => i.period },
    { key: "fixed", header: "Fixed classes", render: (i) => i.fixedClasses },
    { key: "taken", header: "Classes taken", render: (i) => i.classesTaken },
    { key: "payable", header: "Payable", render: (i) => `₹${i.payableFees}` },
    { key: "balance", header: "Balance", render: (i) => `₹${i.balance}` },
    { key: "status", header: "Status", render: (i) => <Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge> },
    {
      key: "proof",
      header: "Payment proof",
      render: (i) => (i.proofCount > 0 ? <Badge tone="success">{i.proofCount} file{i.proofCount === 1 ? "" : "s"}</Badge> : <Badge tone="neutral">None</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (i) => (
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          {i.status !== "PAID" && (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setPaymentTarget(i); }}>
              Record payment
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setProofTarget({ ownerId: i.id, title: `Payment proof — ${i.student.name}` });
            }}
          >
            {i.proofCount > 0 ? "View proof" : "Add proof"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell nav={nav}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Fees</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              {isSuperAdmin ? "Rate cards and student fee invoices across every branch." : "Rate cards by board/class, and student fee invoices."}
            </p>
          </div>
          {tab === "invoices" && !isSuperAdmin && <Button onClick={() => setCreateInvoiceOpen(true)}>+ New invoice</Button>}
        </div>

        {isSuperAdmin && (
          <div style={{ maxWidth: 260, marginBottom: "var(--space-4)" }}>
            <Select label="Branch" placeholder="All branches" options={branchOptions} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          </div>
        )}

        <div className={styles.tabs}>
          <button className={[styles.tab, tab === "rateCards" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("rateCards")} type="button">
            Rate Cards
          </button>
          <button className={[styles.tab, tab === "invoices" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("invoices")} type="button">
            Student Invoices
          </button>
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          {tab === "rateCards" ? (
            <>
              {!isSuperAdmin && (
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <Alert variant="info">Rates are set by Super Admin. Contact them to add or change a rate card.</Alert>
                </div>
              )}
              <DataTable
                columns={rateCardColumns}
                rows={rateCards.data ?? []}
                rowKey={(r) => r.id}
                isLoading={rateCards.isLoading}
                emptyTitle="No rate cards yet"
                emptyDescription={isSuperAdmin ? "Add one from Fee Rate Cards." : "Super Admin hasn't set a rate card for this branch yet."}
              />
            </>
          ) : (
            <DataTable
              columns={invoiceColumns}
              rows={invoices.data?.data ?? []}
              rowKey={(i) => i.id}
              isLoading={invoices.isLoading}
              emptyTitle="No invoices yet"
              emptyDescription={isSuperAdmin ? "Invoices raised by branches show up here." : "Create an invoice for a student to start tracking their fees."}
            />
          )}
        </div>
      </div>

      <CreateInvoiceDialog open={createInvoiceOpen} onClose={() => setCreateInvoiceOpen(false)} />
      <RecordPaymentDialog invoice={paymentTarget} onClose={() => setPaymentTarget(null)} />
      <ViewDocumentsDialog target={proofTarget} onClose={() => setProofTarget(null)} ownerType="STUDENT_FEE_INVOICE" docType="PAYMENT_PROOF" />
    </AppShell>
  );
}

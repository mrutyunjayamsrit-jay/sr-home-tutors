import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { Card, DataTable, StatCard } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useTutorPaymentsReport, type ReportFilters } from "@/features/reports/api";
import type { TutorPaymentRow } from "@/features/reports/types";

function firstOfMonth(offsetMonths = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offsetMonths, 1).toISOString().slice(0, 10);
}
function lastOfMonth(offsetMonths = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offsetMonths + 1, 0).toISOString().slice(0, 10);
}
function monthLabel(offsetMonths = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function EarningsPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const filters: ReportFilters = { from: firstOfMonth(monthOffset), to: lastOfMonth(monthOffset) };
  const { data, isLoading } = useTutorPaymentsReport(filters, true);

  const rows = data?.rows ?? [];
  const totalClasses = rows.reduce((sum, r) => sum + r.classesTaken, 0);
  const totalPayable = data?.summary.totalPayable ?? 0;

  const columns: Column<TutorPaymentRow>[] = [
    { key: "studentName", header: "Student", render: (r) => r.studentName },
    { key: "fixedClasses", header: "Fixed Classes", render: (r) => r.fixedClasses },
    { key: "classesTaken", header: "Classes Taken", render: (r) => r.classesTaken },
    { key: "rate", header: "Rate/Class", render: (r) => `₹${r.fixedFees}` },
    { key: "payable", header: "Payable", render: (r) => <strong>₹{r.payableAmount}</strong> },
  ];

  return (
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Earnings</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          What you've earned, computed live from classes actually taken — never a fixed guess.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m - 1)}
            style={{ border: "1px solid var(--border-strong)", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "6px 12px", cursor: "pointer" }}
          >
            ← Previous
          </button>
          <strong>{monthLabel(monthOffset)}</strong>
          <button
            type="button"
            onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
            disabled={monthOffset >= 0}
            style={{ border: "1px solid var(--border-strong)", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "6px 12px", cursor: monthOffset >= 0 ? "not-allowed" : "pointer", opacity: monthOffset >= 0 ? 0.5 : 1 }}
          >
            Next →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
          <StatCard label="Classes taken" value={totalClasses} loading={isLoading} />
          <StatCard label="Total payable" value={`₹${totalPayable}`} loading={isLoading} hint={monthLabel(monthOffset)} />
          <StatCard label="Students" value={rows.length} loading={isLoading} />
        </div>

        <Card>
          <h2 style={{ marginTop: 0, fontSize: "var(--text-lg)" }}>Breakdown by student</h2>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.studentName}
            isLoading={isLoading}
            emptyTitle="Nothing to show for this month"
            emptyDescription="Payable amounts show up here once classes are marked as attended."
          />
        </Card>
      </div>
    </AppShell>
  );
}

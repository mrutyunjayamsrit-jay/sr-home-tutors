import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { Button, DataTable, Badge, Card } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useParentEnquiries } from "@/features/enquiries/api";
import { CreateParentEnquiryDialog } from "@/features/enquiries/CreateParentEnquiryDialog";
import { ReferralBonusBanner } from "@/features/announcements/ReferralBonusBanner";
import type { EnquiryStatus, ParentEnquiry } from "@/features/enquiries/types";

const STATUS_TONE: Record<EnquiryStatus, "neutral" | "info" | "success" | "danger"> = {
  NEW: "neutral",
  IN_REVIEW: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
};

/**
 * Reuses the office's Parent Enquiry create form/API as-is — the backend
 * already scopes a tutor's view to referrals THEY submitted (see
 * enquiries.service.ts's assertOwnReferralAccess) and forces them onto
 * their own branch, so no tutor-specific backend surface was needed here.
 */
export function ReferralsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useParentEnquiries({ page: 1, pageSize: 50 });

  const columns: Column<ParentEnquiry>[] = [
    { key: "studentName", header: "Student", render: (e) => <strong>{e.studentName}</strong> },
    { key: "contact", header: "Contact", render: (e) => e.contactNumber },
    { key: "class", header: "Class / Board", render: (e) => `${e.studentClass} · ${e.board}` },
    { key: "status", header: "Status", render: (e) => <Badge tone={STATUS_TONE[e.status]}>{e.status.replace("_", " ")}</Badge> },
    {
      key: "outcome",
      header: "Outcome",
      render: (e) => (e.parent ? <Badge tone="success">Registered</Badge> : <span style={{ color: "var(--text-tertiary)" }}>Pending office review</span>),
    },
  ];

  return (
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Refer a Student</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              Know a student looking for a tutor? Submit their details — your branch office reviews and registers them.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ Refer a student</Button>
        </div>

        <ReferralBonusBanner />

        <Card style={{ marginBottom: "var(--space-4)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            You'll only see referrals you've personally submitted here — the branch office handles review, acceptance,
            and registration.
          </p>
        </Card>

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          emptyTitle="No referrals yet"
          emptyDescription="Referred students you submit will show up here with their status."
        />
      </div>

      <CreateParentEnquiryDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

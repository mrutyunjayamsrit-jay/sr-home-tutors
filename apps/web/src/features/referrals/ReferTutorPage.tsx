import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { Button, DataTable, Badge, Card } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useTutorEnquiries } from "@/features/enquiries/api";
import { CreateTutorEnquiryDialog } from "@/features/enquiries/CreateTutorEnquiryDialog";
import { ReferralBonusBanner } from "@/features/announcements/ReferralBonusBanner";
import type { EnquiryStatus, TutorEnquiry } from "@/features/enquiries/types";

const STATUS_TONE: Record<EnquiryStatus, "neutral" | "info" | "success" | "danger"> = {
  NEW: "neutral",
  IN_REVIEW: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
};

/**
 * Reuses the office's Tutor Enquiry create form/API as-is — the backend
 * scopes a referring tutor's view to referrals THEY submitted (see
 * enquiries.service.ts's assertOwnEnquiryAccess) and forces them onto their
 * own branch, mirroring how ReferralsPage.tsx (refer-a-student) already
 * works.
 */
export function ReferTutorPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useTutorEnquiries({ page: 1, pageSize: 50 });

  const columns: Column<TutorEnquiry>[] = [
    { key: "name", header: "Tutor", render: (e) => <strong>{e.name}</strong> },
    { key: "contact", header: "Contact", render: (e) => e.contactNumber },
    { key: "education", header: "Education", render: (e) => e.education },
    { key: "status", header: "Status", render: (e) => <Badge tone={STATUS_TONE[e.status]}>{e.status.replace("_", " ")}</Badge> },
    {
      key: "outcome",
      header: "Outcome",
      render: (e) => (e.tutor ? <Badge tone="success">Registered</Badge> : <span style={{ color: "var(--text-tertiary)" }}>Pending office review</span>),
    },
  ];

  return (
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Refer a Tutor</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              Know a tutor looking for classes? Submit their details — your branch office reviews and registers them.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ Refer a tutor</Button>
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
          emptyDescription="Referred tutors you submit will show up here with their status."
        />
      </div>

      <CreateTutorEnquiryDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

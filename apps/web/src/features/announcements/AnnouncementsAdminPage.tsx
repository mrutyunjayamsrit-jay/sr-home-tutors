import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV, BRANCH_NAV } from "@/app/navConfig";
import { Card, Button, TextField, Select, Checkbox, Badge, toast, EmptyState, Spinner } from "@/components/ui";
import { useAuthStore } from "@/features/auth/authStore";
import { useBranches } from "@/features/branches/api";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "./api";
import type { AnnouncementAudience } from "./types";

const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "PARENTS", label: "Parents only" },
  { value: "TUTORS", label: "Tutors only" },
  { value: "STUDENTS", label: "Students only" },
  { value: "BRANCH_STAFF", label: "Branch staff only" },
];

const schema = z.object({
  title: z.string().min(2, "Give it a short title").max(150),
  body: z.string().min(1, "Write the announcement").max(4000),
  audience: z.enum(["ALL", "TUTORS", "PARENTS", "STUDENTS", "BRANCH_STAFF"]),
  branchId: z.string().optional(),
  isReferralBonus: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

/**
 * Shared by Branch Admin (/branch/announcements, own branch only) and Super
 * Admin (/admin/announcements) — a Super Admin additionally gets a branch
 * picker (blank = institute-wide) since only they can publish globally.
 */
export function AnnouncementsAdminPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const list = useAnnouncements({ page: 1, pageSize: 50 });
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const branches = useBranches({ page: 1, pageSize: 100 });
  const branchOptions = (branches.data?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { audience: "ALL", branchId: "", isReferralBonus: false },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createAnnouncement.mutateAsync({
        title: values.title,
        body: values.body,
        audience: values.audience,
        branchId: isSuperAdmin ? values.branchId || undefined : undefined,
        category: values.isReferralBonus ? "REFERRAL_BONUS" : undefined,
      });
      toast.success(
        values.isReferralBonus ? "Referral bonus announcement published" : "Announcement published",
      );
      reset({ title: "", body: "", audience: "ALL", branchId: "", isReferralBonus: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish announcement");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement.mutateAsync(id);
      toast.success("Announcement removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove announcement");
    }
  };

  const items = list.data?.data ?? [];

  return (
    <AppShell nav={isSuperAdmin ? ADMIN_NAV : BRANCH_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Announcements</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          {isSuperAdmin
            ? "Publish updates for the whole institute or one branch — they show up instantly in the Parent Portal, Tutor app, and Branch office."
            : "Publish updates for parents, tutors, or your whole branch — they show up instantly in the Parent Portal and Tutor app."}
        </p>

        <Card style={{ marginBottom: "var(--space-5)" }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
            <TextField label="Title" placeholder="e.g. Term exams begin next month" error={errors.title?.message} {...register("title")} />
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>Message</span>
              <textarea
                rows={4}
                placeholder="Write the announcement…"
                {...register("body")}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-strong)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  resize: "vertical",
                }}
              />
              {errors.body?.message && <span style={{ color: "var(--color-danger-500)", fontSize: "var(--text-xs)" }}>{errors.body.message}</span>}
            </label>
            <Select label="Audience" options={AUDIENCE_OPTIONS} {...register("audience")} />
            {isSuperAdmin && (
              <Select
                label="Branch"
                placeholder="Institute-wide (all branches)"
                options={branchOptions}
                {...register("branchId")}
              />
            )}
            <div>
              <Checkbox label="This is a referral bonus announcement" {...register("isReferralBonus")} />
              <p style={{ margin: "4px 0 0 26px", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                Also shows as a banner right on the Refer a Student / Refer a Tutor pages
              </p>
            </div>
            <Button type="submit" loading={createAnnouncement.isPending} style={{ alignSelf: "flex-start" }}>
              {isSuperAdmin ? "Publish" : "Publish to your branch"}
            </Button>
          </form>
        </Card>

        {list.isLoading ? (
          <Spinner size="lg" />
        ) : items.length === 0 ? (
          <EmptyState title="No announcements yet" description="Published announcements will appear here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {items.map((a) => (
              <Card key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
                    <strong>{a.title}</strong>
                    <Badge tone="neutral">{a.audience === "ALL" ? "Everyone" : a.audience.replace("_", " ").toLowerCase()}</Badge>
                    {a.branchId === null && <Badge tone="warning">Global</Badge>}
                    {a.category === "REFERRAL_BONUS" && <Badge tone="success">Referral bonus</Badge>}
                  </div>
                  <p style={{ margin: "4px 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)", whiteSpace: "pre-wrap" }}>{a.body}</p>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{new Date(a.publishedAt).toLocaleString()}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} disabled={a.branchId === null && !isSuperAdmin}>
                  Remove
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

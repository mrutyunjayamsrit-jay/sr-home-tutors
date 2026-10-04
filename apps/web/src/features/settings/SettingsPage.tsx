import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV } from "@/app/navConfig";
import { Card, Button, TextField, Modal, Alert, toast } from "@/components/ui";
import { useSettings, useUpdateSettings } from "./api";
import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/authStore";
import { setAccessToken } from "@/lib/apiClient";

const profileSchema = z.object({
  organizationName: z.string().min(2, "Required"),
  supportEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  supportPhone: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const rulesSchema = z.object({
  tutorRulesText: z.string().min(10, "At least 10 characters"),
});
type RulesValues = z.infer<typeof rulesSchema>;

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const rulesForm = useForm<RulesValues>({ resolver: zodResolver(rulesSchema) });

  useEffect(() => {
    if (!settings) return;
    profileForm.reset({
      organizationName: settings.organizationName,
      supportEmail: settings.supportEmail ?? "",
      supportPhone: settings.supportPhone ?? "",
    });
    rulesForm.reset({ tutorRulesText: settings.tutorRulesText });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const saveProfile = async (values: ProfileValues) => {
    try {
      await updateSettings.mutateAsync(values);
      toast.success("Organization profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    }
  };

  const saveRules = async (values: RulesValues) => {
    try {
      await updateSettings.mutateAsync(values);
      toast.success("Tutor rules & regulations updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    }
  };

  return (
    <AppShell nav={ADMIN_NAV}>
      <div className="page-inner" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>
        <div>
          <h1 style={{ margin: 0 }}>Settings</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>Organization-wide configuration.</p>
        </div>

        <Card>
          <h2 style={{ marginTop: 0, fontSize: "var(--text-lg)" }}>Organization profile</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginTop: "-8px" }}>
            Shown across the app and used as the contact point for support queries.
          </p>
          <form
            onSubmit={profileForm.handleSubmit(saveProfile)}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
            noValidate
          >
            <TextField
              label="Organization name"
              error={profileForm.formState.errors.organizationName?.message}
              disabled={isLoading}
              {...profileForm.register("organizationName")}
            />
            <TextField
              label="Support email"
              type="email"
              error={profileForm.formState.errors.supportEmail?.message}
              disabled={isLoading}
              {...profileForm.register("supportEmail")}
            />
            <TextField
              label="Support phone"
              error={profileForm.formState.errors.supportPhone?.message}
              disabled={isLoading}
              {...profileForm.register("supportPhone")}
            />
            <Button type="submit" loading={updateSettings.isPending} style={{ alignSelf: "flex-start" }}>
              Save profile
            </Button>
          </form>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0, fontSize: "var(--text-lg)" }}>Tutor rules & regulations</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginTop: "-8px" }}>
            Shown to every tutor for acknowledgment at login, per the institute's compliance requirement. Changes apply
            to future acknowledgments.
          </p>
          <form
            onSubmit={rulesForm.handleSubmit(saveRules)}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
            noValidate
          >
            <textarea
              {...rulesForm.register("tutorRulesText")}
              disabled={isLoading}
              rows={5}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                resize: "vertical",
              }}
            />
            {rulesForm.formState.errors.tutorRulesText && (
              <span style={{ color: "var(--color-danger-500)", fontSize: "var(--text-xs)" }}>
                {rulesForm.formState.errors.tutorRulesText.message}
              </span>
            )}
            <Button type="submit" loading={updateSettings.isPending} style={{ alignSelf: "flex-start" }}>
              Save rules text
            </Button>
          </form>
        </Card>

        <SecuritySection />
      </div>
    </AppShell>
  );
}

function SecuritySection() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutEverywhere = async () => {
    setLoggingOut(true);
    try {
      await authApi.logoutAllDevices();
      setAccessToken(null);
      useAuthStore.setState({ user: null, status: "unauthenticated" });
      toast.success("Signed out of all devices");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log out everywhere");
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card>
      <h2 style={{ marginTop: 0, fontSize: "var(--text-lg)" }}>Security</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: "var(--text-sm)" }}>Password</strong>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Change your own sign-in password.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate("/reset-password")}>
            Change password
          </Button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: "var(--text-sm)" }}>Active sessions</strong>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Sign out of this account on every device, including this one.
            </p>
          </div>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Log out everywhere
          </Button>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Log out everywhere?">
        <Alert variant="warning">This immediately ends every active session for your account, including this one. You'll need to sign in again.</Alert>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth loading={loggingOut} onClick={handleLogoutEverywhere}>
            Log out everywhere
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

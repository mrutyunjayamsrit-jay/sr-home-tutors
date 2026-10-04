import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Button, Checkbox, Spinner, toast } from "@/components/ui";
import { authApi } from "./api";

/**
 * "I obey the rules and regulations of SR Home Tutors and all criteria of
 * the institute" — the source spec requires a tutor to re-acknowledge this
 * on every login, as a compliance/audit record (see RuleAcknowledgment in
 * the data model), not just a one-time UI checkbox. This wraps the tutor
 * area and blocks it with a non-dismissible modal until today's
 * acknowledgment is recorded — text is pulled from Settings, so a super
 * admin can update it without a code change.
 */
export function RulesGate({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["auth", "rules-status"],
    queryFn: () => authApi.rulesStatus(),
  });
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setChecked(false);
  }, [data?.acknowledgedToday]);

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      await authApi.acknowledgeRules();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record acknowledgment");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const needsAcknowledgment = data ? !data.acknowledgedToday : false;

  return (
    <>
      {children}
      <Modal open={needsAcknowledgment} onClose={() => {}} title="Before you continue" dismissible={false}>
        <p style={{ margin: 0, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{data?.rulesText}</p>
        <Checkbox label="I acknowledge and agree to the above" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <Button onClick={handleAcknowledge} disabled={!checked} loading={submitting} fullWidth>
          Continue
        </Button>
      </Modal>
    </>
  );
}

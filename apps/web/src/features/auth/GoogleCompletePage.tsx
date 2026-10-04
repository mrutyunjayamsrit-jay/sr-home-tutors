import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Spinner, Alert, Button } from "@/components/ui";
import { useAuthStore } from "./authStore";
import { ROLE_HOME_PATH } from "./types";
import styles from "@/components/ui/AuthLayout.module.css";

/**
 * Landing target for the Google OIDC redirect (see docs/ARCHITECTURE.md §5
 * and auth.controller.ts googleCallback — the access token is intentionally
 * NOT passed via URL, only the httpOnly refresh cookie is set server-side).
 * This page's only job is to exchange that cookie for a real session.
 */
export function GoogleCompletePage() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    bootstrap().then(() => {
      const current = useAuthStore.getState().user;
      if (!current) {
        setFailed(true);
        return;
      }
      navigate(current.mustResetPassword ? "/reset-password" : ROLE_HOME_PATH[current.role], { replace: true });
    });
  }, [bootstrap, navigate]);

  if (failed) {
    return (
      <div className={styles.page}>
        <Card className={styles.card}>
          <Alert variant="danger">
            We couldn't complete Google sign-in. Your account may not be set up for it yet — contact your super
            admin.
          </Alert>
          <Button variant="secondary" onClick={() => navigate("/login", { replace: true })}>
            Back to sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card} style={{ alignItems: "center", textAlign: "center" }}>
        <Spinner size="lg" />
        <p>Completing sign-in{user ? "" : "…"}</p>
      </Card>
    </div>
  );
}

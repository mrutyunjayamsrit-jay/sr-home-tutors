import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/authStore";
import { ROLE_HOME_PATH } from "@/features/auth/types";
import { Spinner } from "@/components/ui";

/**
 * Inverse of ProtectedRoute: for pages that only make sense when signed
 * OUT (login). An already-authenticated user landing here (e.g. via a
 * bookmarked /login link, or browser back-navigation) is bounced straight
 * to their dashboard instead of being shown the login form again.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAuthStore();

  if (status === "idle" || status === "loading") {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.mustResetPassword ? "/reset-password" : ROLE_HOME_PATH[user.role]} replace />;
  }

  return <>{children}</>;
}

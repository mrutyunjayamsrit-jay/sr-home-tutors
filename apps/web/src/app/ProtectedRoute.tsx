import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/authStore";
import type { Role } from "@/features/auth/types";
import { Spinner } from "@/components/ui";

interface ProtectedRouteProps {
  children: ReactNode;
  allow?: Role[];
}

/**
 * Gates a route on auth status and (optionally) role. Centralizing this
 * here — rather than scattering `if (!user) redirect` checks through
 * individual pages — is what keeps authorization consistent across the app.
 * The API is still the real authority (every request re-checks role/branch
 * server-side); this only controls what the UI shows.
 */
export function ProtectedRoute({ children, allow }: ProtectedRouteProps) {
  const { user, status } = useAuthStore();
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.mustResetPassword && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

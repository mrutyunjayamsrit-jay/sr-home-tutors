import { create } from "zustand";
import { authApi } from "./api";
import type { AuthUser } from "./types";
import { setAccessToken, registerSessionExpiredHandler } from "@/lib/apiClient";
import { toast } from "@/components/ui";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Called once on app boot to see if an existing refresh-cookie session is still valid. */
  bootstrap: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,

  // Deliberately does NOT set status to "loading" while the request is in
  // flight: `status` drives ProtectedRoute/PublicOnlyRoute's full-page
  // bootstrap spinner, which would otherwise unmount the login form (and
  // whatever error it's showing) on every submit. Per-submit loading state
  // is the form's own concern — see LoginPage's `isSubmitting`.
  async login(identifier, password, rememberMe = true) {
    set({ error: null });
    try {
      const { user, accessToken } = await authApi.login(identifier, password, rememberMe);
      setAccessToken(accessToken);
      set({ user, status: "authenticated", error: null });
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      set({ status: "unauthenticated", error: message });
      throw err;
    }
  },

  async logout() {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      set({ user: null, status: "unauthenticated" });
    }
  },

  async bootstrap() {
    set({ status: "loading" });
    try {
      const { user, accessToken } = await authApi.refresh();
      setAccessToken(accessToken);
      set({ user, status: "authenticated" });
    } catch {
      // No valid session cookie — this is the normal signed-out state, not
      // an error worth surfacing (see authApi.refresh's skipAuthRetry note).
      setAccessToken(null);
      set({ user: null, status: "unauthenticated" });
    }
  },

  setUser(user) {
    set({ user });
  },
}));

// Fired by apiClient only when a call made WHILE authenticated gets a 401
// and the subsequent refresh attempt also fails — i.e. a real mid-session
// expiry (idle too long, refresh token revoked elsewhere, etc.), as opposed
// to bootstrap()'s routine "no session yet" case, which never reaches here.
registerSessionExpiredHandler(() => {
  const wasAuthenticated = useAuthStore.getState().status === "authenticated";
  setAccessToken(null);
  useAuthStore.setState({ user: null, status: "unauthenticated" });
  if (wasAuthenticated) {
    toast.info("Your session has expired. Please log in again.");
  }
});

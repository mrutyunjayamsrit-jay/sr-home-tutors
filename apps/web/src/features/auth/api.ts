import { api, apiRequest } from "@/lib/apiClient";
import type { AuthUser } from "./types";

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  // skipAuthRetry: true — a 401 from THIS endpoint means "wrong credentials,"
  // never "expired access token." Without it, apiClient's generic 401
  // handling treated a bad-password attempt as "try refreshing, then show
  // session-expired" — so a wrong password surfaced "Your session has
  // expired" instead of "Invalid credentials." Login/refresh are the only
  // two endpoints where a 401 is a normal, expected outcome rather than a
  // signal to attempt token refresh.
  login: (identifier: string, password: string, rememberMe = true) =>
    apiRequest<LoginResponse>("/auth/login", { method: "POST", body: { identifier, password, rememberMe }, skipAuthRetry: true }),

  // skipAuthRetry: true — a 401 here just means "no valid session," which is
  // the normal/expected state on first visit or after the cookie expires.
  // Without this, a fresh visitor with no cookie at all would trigger a
  // redundant second refresh attempt and the same "session expired" handling
  // used for a real mid-session expiry (see apiClient.ts's onSessionExpired).
  refresh: () => apiRequest<LoginResponse>("/auth/refresh", { method: "POST", skipAuthRetry: true }),

  logout: () => api.post<{ loggedOut: true }>("/auth/logout"),

  logoutAllDevices: () => api.post<{ loggedOutEverywhere: true }>("/auth/logout-all"),

  me: () => api.get<AuthUser>("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ passwordChanged: true }>("/auth/change-password", { currentPassword, newPassword }),

  acknowledgeRules: () => api.post<{ acknowledged: true }>("/auth/acknowledge-rules", { acknowledged: true }),

  rulesStatus: () => api.get<{ acknowledgedToday: boolean; rulesText: string }>("/auth/rules-status"),

  googleSignInUrl: () => api.url("/auth/google"),
};

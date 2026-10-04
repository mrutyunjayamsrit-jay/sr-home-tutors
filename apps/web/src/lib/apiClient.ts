/**
 * Thin fetch wrapper around the backend's consistent response envelope
 * ({ success: true, data, meta } | { success: false, error }). Handles
 * attaching the in-memory access token, and transparently refreshing it
 * once via the httpOnly cookie on a 401 before giving up.
 *
 * The access token deliberately lives ONLY in memory (a module-level
 * variable here) — never in localStorage/sessionStorage, so it can't be
 * read by an XSS payload that doesn't also control this JS module, and it
 * naturally clears on tab close. The refresh token is an httpOnly cookie
 * the browser sends automatically; this module never sees its value.
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Registered once by the auth store so apiClient can trigger a logout without importing it (avoids a circular dependency). */
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  skipAuthRetry?: boolean;
}

async function rawRequest(path: string, options: RequestOptions) {
  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    credentials: "include", // send the httpOnly refresh cookie where relevant
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await rawRequest("/auth/refresh", { method: "POST", skipAuthRetry: true });
        if (!res.ok) return false;
        const json = await res.json();
        setAccessToken(json.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

interface Envelope<T> {
  data: T;
  meta?: ApiMeta;
}

async function apiRequestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  let res = await rawRequest(path, options);

  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path, options);
    } else {
      onSessionExpired?.();
      throw new ApiError("AUTHENTICATION_ERROR", "Your session has expired. Please log in again.", 401);
    }
  }

  // A 204 (e.g. DELETE endpoints) has no body — res.json() would throw on
  // the empty string, and without this check that failure was previously
  // indistinguishable from a real error response, so every successful
  // delete surfaced as "Something went wrong." Envelope-shaped success
  // responses always have a body; only a bodyless 204 short-circuits here.
  if (res.status === 204) {
    return { data: undefined as T, meta: undefined };
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    const error = json?.error ?? { code: "UNKNOWN_ERROR", message: "Something went wrong" };
    throw new ApiError(error.code, error.message, res.status, error.details);
  }

  return { data: json.data as T, meta: json.meta as ApiMeta | undefined };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await apiRequestEnvelope<T>(path, options);
  return data;
}

/**
 * Triggers a browser download for an authenticated endpoint. A plain
 * `<a href="...">` can't carry our in-memory bearer token (only cookies
 * ride along automatically), so a direct link to a protected CSV/export
 * route would just 401. Instead we fetch it as an authenticated request,
 * then hand the browser a blob URL to save.
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await rawRequest(path, { method: "GET" });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(json?.error?.code ?? "UNKNOWN_ERROR", json?.error?.message ?? "Download failed", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Multipart upload for an authenticated endpoint. Deliberately bypasses
 * rawRequest — that hardcodes `Content-Type: application/json`, which would
 * break the multipart boundary the browser needs to set itself from the
 * FormData body. We attach only the bearer token, same auth model as
 * everything else.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const error = json?.error ?? { code: "UNKNOWN_ERROR", message: "Upload failed" };
    throw new ApiError(error.code, error.message, res.status, error.details);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  getWithMeta: <T>(path: string) => apiRequestEnvelope<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  /** Full URL for links the browser navigates to directly (not fetch), e.g. the Google sign-in redirect. */
  url: (path: string) => `${API_BASE}${path}`,
};

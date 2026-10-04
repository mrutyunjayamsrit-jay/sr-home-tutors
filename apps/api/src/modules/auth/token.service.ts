import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import type { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  branchId: string | null;
  profileId?: string;
}

/** Short-lived, stateless. Never stored server-side; validity = signature + exp. */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    // env.JWT_ACCESS_TTL is a free-form validated string (e.g. "15m"); the
    // jsonwebtoken types brand this as a template-literal `StringValue`
    // (from `ms`) that a plain `string` can't satisfy statically, even
    // though it's the correct runtime shape — hence the narrow cast here.
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
    issuer: "sr-home-tutors-api",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: "sr-home-tutors-api",
  }) as AccessTokenPayload;
}

/**
 * Refresh tokens are opaque random strings (see password.util.generateOpaqueToken),
 * NOT JWTs — only their SHA-256 hash is stored in RefreshToken.tokenHash, so a
 * database read is required to validate one (allows revocation, unlike a
 * stateless JWT refresh token). This function exists only to centralize the
 * cookie name/options so they can't drift between set/clear call sites.
 */
export const REFRESH_COOKIE_NAME = "srht_refresh";

/**
 * `persistent=true` (the "Remember me" case, and the default) sets `maxAge`
 * so the cookie survives browser restarts up to JWT_REFRESH_TTL.
 * `persistent=false` omits `maxAge`/`expires` entirely, which makes it a
 * session cookie — the browser drops it when the tab/browser closes, even
 * though the underlying RefreshToken row in the DB stays valid until its
 * normal expiry. That's the whole "remember me" mechanism: no separate TTL
 * bookkeeping needed, just whether the browser is told to persist the cookie.
 */
export function refreshCookieOptions(persistent = true) {
  return {
    httpOnly: true,
    // SameSite=None is only valid to browsers alongside Secure — forced on
    // whenever cross-site mode is on, independent of NODE_ENV, since a
    // cross-origin deployment is always going to be HTTPS-only anyway (see
    // env.ts's COOKIE_CROSS_SITE).
    secure: env.NODE_ENV === "production" || env.COOKIE_CROSS_SITE,
    sameSite: (env.COOKIE_CROSS_SITE ? "none" : "strict") as "none" | "strict",
    path: "/api/auth",
    ...(persistent ? { maxAge: parseTtlToMs(env.JWT_REFRESH_TTL) } : {}),
  };
}

function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit!]!;
  return value * unitMs;
}

import rateLimit from "express-rate-limit";
import { env } from "@/config/env";

/** General API-wide limiter — generous, mainly an abuse backstop. */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } },
});

/** Tight limiter for login/refresh — the brute-force-relevant endpoints. */
export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many login attempts, try again later" } },
});

/**
 * Tight limiter for the public, unauthenticated enquiry forms on the home
 * page — these write real rows to the enquiry pipeline with no login to
 * rely on for abuse control, so they get the same brute-force-relevant
 * treatment as login rather than the generous API-wide default.
 */
export const publicFormRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many submissions — please try again later" } },
});

/**
 * Guards the tutor-initiated attendance-marking endpoints (location and
 * manual-area) against being hammered — both write a real attendance/
 * payroll record, so they get the same brute-force-relevant treatment as
 * login rather than the generous API-wide default.
 */
export const attendanceMarkRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts — try again in a few minutes" } },
});

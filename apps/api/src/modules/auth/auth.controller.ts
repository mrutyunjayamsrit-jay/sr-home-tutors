import type { Request } from "express";
import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok } from "@/common/utils/apiResponse";
import { AuthenticationError, ForbiddenError, ValidationError } from "@/common/errors/AppError";
import { authService } from "./auth.service";
import { googleService } from "./google.service";
import { refreshCookieOptions, REFRESH_COOKIE_NAME } from "./token.service";
import { loginSchema, changePasswordSchema, acknowledgeRulesSchema } from "./auth.types";
import { authRepository } from "./auth.repository";
import { settingsService } from "@/modules/settings/settings.service";

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // needs to survive the Google redirect (top-level nav)
  maxAge: 5 * 60 * 1000,
  path: "/api/auth/google",
};

function requestContext(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get("user-agent") ?? undefined };
}

export const authController = {
  login: asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.login(
      input.identifier,
      input.password,
      requestContext(req),
    );
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(input.rememberMe));
    ok(res, { user, accessToken });
  }),

  refresh: asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!raw) throw new AuthenticationError("No active session");
    const { user, accessToken, refreshToken } = await authService.refresh(raw, requestContext(req));
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    ok(res, { user, accessToken });
  }),

  logout: asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(raw);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    ok(res, { loggedOut: true });
  }),

  me: asyncHandler(async (req, res) => {
    if (!req.user) throw new AuthenticationError("Not authenticated");
    const user = await authRepository.findUserById(req.user.id);
    if (!user) throw new AuthenticationError("Not authenticated");
    const { passwordHash: _p, googleSub: _g, ...safe } = user;
    ok(res, safe);
  }),

  changePassword: asyncHandler(async (req, res) => {
    if (!req.user) throw new AuthenticationError("Not authenticated");
    const input = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.id, input.currentPassword, input.newPassword);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    ok(res, { passwordChanged: true });
  }),

  logoutAllDevices: asyncHandler(async (req, res) => {
    if (!req.user) throw new AuthenticationError("Not authenticated");
    await authService.logoutAllDevices(req.user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    ok(res, { loggedOutEverywhere: true });
  }),

  acknowledgeRules: asyncHandler(async (req, res) => {
    if (!req.user) throw new AuthenticationError("Not authenticated");
    acknowledgeRulesSchema.parse(req.body);
    await authService.acknowledgeRules(req.user.id, req.ip);
    ok(res, { acknowledged: true });
  }),

  rulesStatus: asyncHandler(async (req, res) => {
    if (!req.user) throw new AuthenticationError("Not authenticated");
    const [acknowledgedToday, settings] = await Promise.all([
      authService.hasAcknowledgedRulesToday(req.user.id),
      settingsService.get(),
    ]);
    ok(res, { acknowledgedToday, rulesText: settings.tutorRulesText });
  }),

  googleStart: asyncHandler(async (req, res) => {
    if (!googleService.isConfigured) {
      throw new ValidationError("Google sign-in is not configured on this server");
    }
    const { state, nonce, codeVerifier, codeChallenge } = googleService.buildAuthorizationRequest();
    res.cookie("g_state", state, OAUTH_COOKIE_OPTS);
    res.cookie("g_nonce", nonce, OAUTH_COOKIE_OPTS);
    res.cookie("g_verifier", codeVerifier, OAUTH_COOKIE_OPTS);
    const url = await googleService.getAuthorizationUrl({ state, nonce, codeChallenge });
    res.redirect(url);
  }),

  googleCallback: asyncHandler(async (req, res) => {
    const expectedState = req.cookies?.g_state;
    const expectedNonce = req.cookies?.g_nonce;
    const codeVerifier = req.cookies?.g_verifier;
    res.clearCookie("g_state", { path: "/api/auth/google" });
    res.clearCookie("g_nonce", { path: "/api/auth/google" });
    res.clearCookie("g_verifier", { path: "/api/auth/google" });

    if (!expectedState || !expectedNonce || !codeVerifier) {
      throw new ForbiddenError("Google sign-in session expired, please try again");
    }

    const tokenSet = await googleService.handleCallback({
      callbackParams: req.query as Record<string, string>,
      expectedState,
      expectedNonce,
      codeVerifier,
    });
    const user = await googleService.resolveLocalUser(tokenSet);

    // Establish the session the same way password login does. We deliberately
    // do NOT put the access token in this redirect's URL (query params end up
    // in browser history / referrer headers / server access logs) — only the
    // httpOnly refresh cookie is set here. The frontend's landing page calls
    // POST /api/auth/refresh on load to mint the actual access token.
    const { refreshToken } = await authService.issueSessionForUser(user.id, requestContext(req));
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

    const redirectUrl = new URL("/auth/google/complete", process.env.WEB_URL ?? "http://localhost:5173");
    res.redirect(redirectUrl.toString());
  }),
};

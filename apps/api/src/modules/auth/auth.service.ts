import { AuthenticationError, ForbiddenError, ValidationError } from "@/common/errors/AppError";
import type { AccessTokenPayload } from "./token.service";
import { REFRESH_COOKIE_NAME, signAccessToken } from "./token.service";
import { authRepository } from "./auth.repository";
import { generateOpaqueToken, hashPassword, verifyPassword } from "./password.util";
import { logger } from "@/common/logger";
import type { User } from "@prisma/client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

type UserWithProfiles = User & {
  tutorProfile: { id: string } | null;
  parentProfile: { id: string } | null;
  studentProfile: { id: string } | null;
};

function toAccessPayload(user: UserWithProfiles): AccessTokenPayload {
  const profileId =
    user.tutorProfile?.id ?? user.parentProfile?.id ?? user.studentProfile?.id ?? undefined;
  return { sub: user.id, role: user.role, branchId: user.branchId, profileId };
}

function sanitizeUser(user: UserWithProfiles) {
  const { passwordHash: _passwordHash, googleSub: _googleSub, ...safe } = user;
  return safe;
}

async function issueTokenPair(user: UserWithProfiles, ctx: RequestContext) {
  const accessToken = signAccessToken(toAccessPayload(user));
  const refreshToken = generateOpaqueToken();
  await authRepository.createRefreshToken({
    userId: user.id,
    rawToken: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  });
  return { accessToken, refreshToken };
}

export const authService = {
  async login(identifier: string, password: string, ctx: RequestContext) {
    const user = (await authRepository.findUserByIdentifier(identifier)) as UserWithProfiles | null;

    // Constant-shape response whether the user exists or not, to avoid
    // user-enumeration via response timing/content differences.
    if (!user || !user.passwordHash) {
      // Still run a bcrypt compare against a dummy hash so response timing
      // doesn't reveal whether the account exists.
      await verifyPassword(password, "$2a$12$invalidsaltinvalidsaltinvalidsalu");
      throw new AuthenticationError("Invalid credentials");
    }

    if (user.status === "DISABLED") {
      throw new ForbiddenError("This account has been disabled. Contact your branch office.");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenError("Too many failed attempts. Try again later.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const nextCount = user.failedLoginCount + 1;
      const lockUntil = nextCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
      await authRepository.incrementFailedLogin(user.id, lockUntil);
      logger.warn({ userId: user.id, ip: ctx.ipAddress }, "Failed login attempt");
      throw new AuthenticationError("Invalid credentials");
    }

    await authRepository.resetFailedLogin(user.id);

    const { accessToken, refreshToken } = await issueTokenPair(user, ctx);
    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  async refresh(rawRefreshToken: string, ctx: RequestContext) {
    const existing = await authRepository.findRefreshTokenByRaw(rawRefreshToken);
    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new AuthenticationError("Session expired, please log in again");
    }

    // Rotation: revoke the used token immediately, issue a fresh pair.
    await authRepository.revokeRefreshToken(existing.id);

    const user = (await authRepository.findUserById(existing.userId)) as UserWithProfiles | null;
    if (!user || user.status === "DISABLED") {
      throw new AuthenticationError("Session expired, please log in again");
    }

    const { accessToken, refreshToken } = await issueTokenPair(user, ctx);
    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  /** Used by the Google callback: establish a session for an already-resolved local user. */
  async issueSessionForUser(userId: string, ctx: RequestContext) {
    const user = (await authRepository.findUserById(userId)) as UserWithProfiles | null;
    if (!user || user.status === "DISABLED") {
      throw new AuthenticationError("Account unavailable");
    }
    const { accessToken, refreshToken } = await issueTokenPair(user, ctx);
    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    const existing = await authRepository.findRefreshTokenByRaw(rawRefreshToken);
    if (existing && !existing.revokedAt) {
      await authRepository.revokeRefreshToken(existing.id);
    }
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await authRepository.findUserById(userId);
    if (!user || !user.passwordHash) throw new AuthenticationError("Not authenticated");

    // Skip current-password check only for the very first forced reset of
    // an admin-issued temp password... actually still require it: the temp
    // password IS the current password, so this check is always meaningful.
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError("Current password is incorrect");

    const newHash = await hashPassword(newPassword);
    await authRepository.updatePasswordHash(userId, newHash);
    // Force re-login everywhere else after a password change.
    await authRepository.revokeAllRefreshTokensForUser(userId);
  },

  /** Settings page's "Log out of all devices" — revokes every refresh token, including the one that made this request. */
  async logoutAllDevices(userId: string) {
    await authRepository.revokeAllRefreshTokensForUser(userId);
  },

  async acknowledgeRules(userId: string, ipAddress?: string) {
    await authRepository.recordRuleAcknowledgment(userId, ipAddress);
  },

  async hasAcknowledgedRulesToday(userId: string): Promise<boolean> {
    const latest = await authRepository.latestRuleAcknowledgment(userId);
    if (!latest) return false;
    const today = new Date();
    return (
      latest.acknowledgedAt.getFullYear() === today.getFullYear() &&
      latest.acknowledgedAt.getMonth() === today.getMonth() &&
      latest.acknowledgedAt.getDate() === today.getDate()
    );
  },

  refreshCookieName: REFRESH_COOKIE_NAME,
};

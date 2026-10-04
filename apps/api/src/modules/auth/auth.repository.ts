import { prisma } from "@/common/prisma";
import { hashToken } from "./password.util";

export const authRepository = {
  findUserByIdentifier(identifier: string) {
    return prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
      include: { tutorProfile: true, parentProfile: true, studentProfile: true },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { tutorProfile: true, parentProfile: true, studentProfile: true },
    });
  },

  findUserByGoogleSub(googleSub: string) {
    return prisma.user.findUnique({ where: { googleSub } });
  },

  incrementFailedLogin(userId: string, lockUntil: Date | null) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: { increment: 1 },
        ...(lockUntil ? { lockedUntil: lockUntil } : {}),
      },
    });
  },

  resetFailedLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  },

  updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustResetPassword: false,
        // First password reset on an admin-issued account activates it.
        status: "ACTIVE",
      },
    });
  },

  createRefreshToken(params: {
    userId: string;
    rawToken: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.refreshToken.create({
      data: {
        userId: params.userId,
        tokenHash: hashToken(params.rawToken),
        expiresAt: params.expiresAt,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
      },
    });
  },

  findRefreshTokenByRaw(rawToken: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  },

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  revokeAllRefreshTokensForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  recordRuleAcknowledgment(userId: string, ipAddress?: string) {
    return prisma.ruleAcknowledgment.create({ data: { userId, ipAddress } });
  },

  latestRuleAcknowledgment(userId: string) {
    return prisma.ruleAcknowledgment.findFirst({
      where: { userId },
      orderBy: { acknowledgedAt: "desc" },
    });
  },

  linkGoogleSub(userId: string, googleSub: string) {
    return prisma.user.update({ where: { id: userId }, data: { googleSub } });
  },
};

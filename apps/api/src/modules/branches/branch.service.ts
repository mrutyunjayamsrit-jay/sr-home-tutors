import { prisma } from "@/common/prisma";
import { ConflictError, NotFoundError } from "@/common/errors/AppError";
import { branchRepository } from "./branch.repository";
import type { CreateBranchInput, SetBranchPasswordInput, UpdateBranchInput } from "./branch.types";
import { resolveInitialCredential } from "@/modules/auth/credential.util";
import { generateUniqueUsername } from "@/modules/auth/username.util";
import { hashPassword } from "@/modules/auth/password.util";
import { logger } from "@/common/logger";
// import { sendBranchAdminInviteEmail } from "@/modules/notifications/email.service"; // wired once email module lands

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

export const branchService = {
  /**
   * Creates a Branch and its initial Branch Admin (office assistant) login
   * in one transaction — mirrors the source spec's "super admin creates
   * branch id/password and sends it to the branch." Password/Google
   * handling is centralized in credential.util.ts (shared with the Users &
   * Roles "add user" flow): explicit password → use it; blank + Gmail
   * address → Google-only login; blank + non-Gmail → generated temp
   * password with a forced reset.
   */
  async createBranchWithAdmin(input: CreateBranchInput, actorUserId: string) {
    const existing = await branchRepository.findByCode(input.code);
    if (existing) throw new ConflictError(`Branch code "${input.code}" is already in use`);

    const credential = await resolveInitialCredential(input.contactEmail, input.password);
    const username = await generateUniqueUsername(input.code);

    const result = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          name: input.name,
          code: input.code,
          address: input.address,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
        },
      });

      const admin = await tx.user.create({
        data: {
          role: "BRANCH_ADMIN",
          branchId: branch.id,
          name: input.adminName,
          email: input.contactEmail,
          username,
          passwordHash: credential.passwordHash,
          status: "PENDING_ACTIVATION",
          mustResetPassword: credential.mustResetPassword,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          branchId: branch.id,
          action: "BRANCH_CREATED",
          entityType: "Branch",
          entityId: branch.id,
          afterJson: { name: branch.name, code: branch.code },
        },
      });

      return { branch, admin };
    });

    logger.info({ branchId: result.branch.id, adminUserId: result.admin.id }, "Branch created");

    // In production this sends a secure invite email/SMS instead of
    // returning the password in-band; email delivery isn't wired up yet
    // (see docs/DECISIONS.md), so for now the credential is returned
    // directly to the authenticated Super Admin to hand off out-of-band.
    // await sendBranchAdminInviteEmail(result.admin.email!, username, credential.tempPasswordToDisplay);

    return {
      branch: result.branch,
      adminCredentials: {
        username,
        email: input.contactEmail,
        tempPassword: credential.tempPasswordToDisplay,
        wasGenerated: credential.wasGenerated,
        passwordSkipped: credential.passwordSkipped,
      },
    };
  },

  async get(branchId: string) {
    const branch = await branchRepository.findById(branchId);
    if (!branch) throw new NotFoundError("Branch not found");
    return branch;
  },

  list(params: { page: number; pageSize: number; search?: string; isActive?: boolean }) {
    return branchRepository.list(params);
  },

  /**
   * A Branch Admin editing their own branch's profile may only change the
   * address — name/contact email/contact phone/active status are Super
   * Admin decisions. Any of those fields sent by a Branch Admin are
   * silently dropped rather than erroring, same convention as e.g.
   * enquiries.service.ts ignoring a Branch Admin-supplied branchId — the
   * request just does less than it asked for, instead of failing outright.
   */
  async update(branchId: string, input: UpdateBranchInput, actor: Actor) {
    const before = await branchRepository.findById(branchId);
    if (!before) throw new NotFoundError("Branch not found");

    const effectiveInput: UpdateBranchInput = actor.role === "BRANCH_ADMIN" ? { address: input.address } : input;

    const updated = await branchRepository.update(branchId, effectiveInput);

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        branchId,
        action: "BRANCH_UPDATED",
        entityType: "Branch",
        entityId: branchId,
        beforeJson: { ...before },
        afterJson: { ...updated },
      },
    });

    return updated;
  },

  /**
   * Sets a new password directly on this branch's office login — Super
   * Admin only, distinct from the self-service /auth/change-password (which
   * requires knowing the current one). Targets the branch's original
   * BRANCH_ADMIN login (oldest one, matching who createBranchWithAdmin
   * provisions) — if office staff have since added more logins for this
   * branch via Users & Roles, those are managed individually there instead.
   * Forces a re-login everywhere (same as disabling a user) since the old
   * password is no longer valid.
   */
  async setPassword(branchId: string, input: SetBranchPasswordInput, actorUserId: string) {
    const branch = await branchRepository.findById(branchId);
    if (!branch) throw new NotFoundError("Branch not found");

    const admin = await prisma.user.findFirst({
      where: { branchId, role: "BRANCH_ADMIN" },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) throw new NotFoundError("This branch has no office login to set a password for");

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash, mustResetPassword: false, failedLoginCount: 0, lockedUntil: null },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: admin.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId,
          branchId,
          action: "BRANCH_PASSWORD_RESET",
          entityType: "User",
          entityId: admin.id,
        },
      }),
    ]);

    logger.info({ branchId, adminUserId: admin.id }, "Branch office password reset by Super Admin");
  },

  /**
   * Org-wide dashboard numbers for the Super Admin — overall registered
   * tutor/student totals plus a per-branch breakdown of enquiries received
   * vs. how many were actually enrolled (converted to a registered
   * tutor/student). Computed live per branch, same as getStats below, just
   * fanned out across every branch at once.
   */
  async getOrgSummary() {
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const perBranch = await Promise.all(
      branches.map(async (b) => {
        const [tutorEnquiries, parentEnquiries, registeredTutors, registeredStudents] = await Promise.all([
          prisma.tutorEnquiry.count({ where: { branchId: b.id } }),
          prisma.parentEnquiry.count({ where: { branchId: b.id } }),
          prisma.tutor.count({ where: { branchId: b.id } }),
          prisma.student.count({ where: { parent: { branchId: b.id } } }),
        ]);
        return {
          branchId: b.id,
          branchName: b.name,
          tutorEnquiries,
          parentEnquiries,
          totalEnquiries: tutorEnquiries + parentEnquiries,
          registeredTutors,
          registeredStudents,
          totalEnrolled: registeredTutors + registeredStudents,
        };
      }),
    );

    const totals = perBranch.reduce(
      (acc, row) => ({
        registeredTutors: acc.registeredTutors + row.registeredTutors,
        registeredStudents: acc.registeredStudents + row.registeredStudents,
        totalEnquiries: acc.totalEnquiries + row.totalEnquiries,
        totalEnrolled: acc.totalEnrolled + row.totalEnrolled,
      }),
      { registeredTutors: 0, registeredStudents: 0, totalEnquiries: 0, totalEnrolled: 0 },
    );

    return { totals, branches: perBranch };
  },

  /**
   * Dashboard tile numbers for one branch — computed live from the same
   * tables the Enquiries/Registration/Assign Tutor pages themselves read,
   * never a cached counter, so it can never drift from what those pages
   * show. Used by both the Branch Admin's own dashboard and the Super
   * Admin's per-branch view.
   */
  async getStats(branchId: string) {
    const [pendingTutorEnquiries, pendingParentEnquiries, registeredTutors, registeredStudents, runningClasses] = await Promise.all([
      prisma.tutorEnquiry.count({ where: { branchId, status: { in: ["NEW", "IN_REVIEW"] } } }),
      prisma.parentEnquiry.count({ where: { branchId, status: { in: ["NEW", "IN_REVIEW"] } } }),
      prisma.tutor.count({ where: { branchId } }),
      prisma.student.count({ where: { parent: { branchId } } }),
      prisma.assignment.count({ where: { branchId, status: "ACTIVE" } }),
    ]);

    return {
      pendingEnquiries: pendingTutorEnquiries + pendingParentEnquiries,
      pendingTutorEnquiries,
      pendingParentEnquiries,
      registeredTutors,
      registeredStudents,
      runningClasses,
    };
  },
};

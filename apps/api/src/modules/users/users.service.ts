import { prisma } from "@/common/prisma";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import { usersRepository } from "./users.repository";
import type { CreateUserInput, ListUsersQuery } from "./users.types";
import { resolveInitialCredential } from "@/modules/auth/credential.util";
import { generateUniqueUsername } from "@/modules/auth/username.util";
import { logger } from "@/common/logger";

function displayName(user: { name: string | null; tutorProfile: { name: string } | null; parentProfile: { name: string } | null; studentProfile: { name: string } | null }) {
  return user.name ?? user.tutorProfile?.name ?? user.parentProfile?.name ?? user.studentProfile?.name ?? "—";
}

export const usersService = {
  async list(query: ListUsersQuery) {
    const { items, total } = await usersRepository.list(query);
    return {
      items: items.map((u) => ({
        id: u.id,
        role: u.role,
        name: displayName(u),
        email: u.email,
        username: u.username,
        status: u.status,
        branch: u.branch,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
      total,
    };
  },

  listParentsForSelect(branchId?: string) {
    return usersRepository.listParentsForSelect(branchId);
  },

  async create(input: CreateUserInput, actorUserId: string) {
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) throw new ConflictError(`A user with email "${input.email}" already exists`);

    const credential = await resolveInitialCredential(input.email, input.password);
    const username = await generateUniqueUsername(input.name);

    const created = await prisma.$transaction(async (tx) => {
      if (input.role === "STUDENT") {
        const parent = await tx.parent.findUnique({ where: { id: input.parentId } });
        if (!parent) throw new NotFoundError("Selected parent not found");

        const user = await tx.user.create({
          data: {
            role: "STUDENT",
            branchId: parent.branchId,
            name: input.name,
            email: input.email,
            username,
            passwordHash: credential.passwordHash,
            status: "PENDING_ACTIVATION",
            mustResetPassword: credential.mustResetPassword,
            studentProfile: {
              create: {
                parentId: parent.id,
                name: input.name,
                studentClass: input.studentClass,
                board: input.board,
                status: "REGISTERED",
              },
            },
          },
          include: { studentProfile: true },
        });
        return user;
      }

      if (input.role === "TUTOR") {
        return tx.user.create({
          data: {
            role: "TUTOR",
            branchId: input.branchId,
            name: input.name,
            email: input.email,
            username,
            passwordHash: credential.passwordHash,
            status: "PENDING_ACTIVATION",
            mustResetPassword: credential.mustResetPassword,
            tutorProfile: {
              create: {
                branchId: input.branchId,
                name: input.name,
                education: input.education,
                contactNumber: input.contactNumber,
                address: input.address,
                status: "REGISTERED",
              },
            },
          },
          include: { tutorProfile: true },
        });
      }

      if (input.role === "PARENT") {
        return tx.user.create({
          data: {
            role: "PARENT",
            branchId: input.branchId,
            name: input.name,
            email: input.email,
            username,
            passwordHash: credential.passwordHash,
            status: "PENDING_ACTIVATION",
            mustResetPassword: credential.mustResetPassword,
            parentProfile: {
              create: {
                branchId: input.branchId,
                name: input.name,
                contactNumber: input.contactNumber,
                address: input.address,
                status: "REGISTERED",
              },
            },
          },
          include: { parentProfile: true },
        });
      }

      // BRANCH_ADMIN
      return tx.user.create({
        data: {
          role: "BRANCH_ADMIN",
          branchId: input.branchId,
          name: input.name,
          email: input.email,
          username,
          passwordHash: credential.passwordHash,
          status: "PENDING_ACTIVATION",
          mustResetPassword: credential.mustResetPassword,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        actorUserId,
        branchId: created.branchId,
        action: "USER_CREATED",
        entityType: "User",
        entityId: created.id,
        afterJson: { role: created.role, email: created.email, username: created.username },
      },
    });

    logger.info({ userId: created.id, role: created.role }, "User created via Users & Roles");

    return {
      user: created,
      credentials: {
        username,
        email: input.email,
        tempPassword: credential.tempPasswordToDisplay,
        wasGenerated: credential.wasGenerated,
        passwordSkipped: credential.passwordSkipped,
      },
    };
  },

  /**
   * "Delete" disables the login rather than removing the row. A hard delete
   * would either cascade-destroy or orphan historical attendance/payment
   * records tied to this user's Tutor/Parent/Student profile — for a system
   * whose whole point is auditable financial and attendance history, that's
   * the wrong default. The UI still calls this "Delete"; this is what it
   * safely means underneath.
   */
  async remove(userId: string, actorUserId: string) {
    if (userId === actorUserId) {
      throw new ValidationError("You can't delete your own account");
    }

    const target = await usersRepository.findById(userId);
    if (!target) throw new NotFoundError("User not found");

    if (target.role === "SUPER_ADMIN") {
      const activeSuperAdmins = await usersRepository.countActiveByRole("SUPER_ADMIN");
      if (activeSuperAdmins <= 1) {
        throw new ForbiddenError("Can't remove the last remaining Super Admin");
      }
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { status: "DISABLED" } }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId,
          branchId: target.branchId,
          action: "USER_DISABLED",
          entityType: "User",
          entityId: userId,
          beforeJson: { status: target.status },
          afterJson: { status: "DISABLED" },
        },
      }),
    ]);
  },

  /** Re-activates a previously disabled login — the reversible undo for `remove` above. */
  async enable(userId: string, actorUserId: string) {
    const target = await usersRepository.findById(userId);
    if (!target) throw new NotFoundError("User not found");
    if (target.status !== "DISABLED") {
      throw new ValidationError("This user isn't disabled");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } }),
      prisma.auditLog.create({
        data: {
          actorUserId,
          branchId: target.branchId,
          action: "USER_ENABLED",
          entityType: "User",
          entityId: userId,
          beforeJson: { status: target.status },
          afterJson: { status: "ACTIVE" },
        },
      }),
    ]);
  },

  /**
   * True, irreversible deletion of the login row — only ever reached after
   * the user has already been disabled (see remove() above), so this is
   * never the first action taken against an active account. The linked
   * Tutor/Parent/Student profile (and its attendance/payment/assignment
   * history) is deliberately NOT touched: the FK is ON DELETE SET NULL, so
   * the profile just loses its login and survives as a historical record.
   * RefreshToken/RuleAcknowledgment/Notification rows cascade-delete since
   * they have no meaning without the login they belong to.
   */
  async hardDelete(userId: string, actorUserId: string) {
    if (userId === actorUserId) {
      throw new ValidationError("You can't delete your own account");
    }

    const target = await usersRepository.findById(userId);
    if (!target) throw new NotFoundError("User not found");
    if (target.status !== "DISABLED") {
      throw new ValidationError("Disable this user before permanently deleting them");
    }

    if (target.role === "SUPER_ADMIN") {
      const otherSuperAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN", id: { not: userId } } });
      if (otherSuperAdmins === 0) {
        throw new ForbiddenError("Can't permanently delete the last remaining Super Admin");
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId,
        branchId: target.branchId,
        action: "USER_PERMANENTLY_DELETED",
        entityType: "User",
        entityId: userId,
        beforeJson: { role: target.role, email: target.email, username: target.username, status: target.status },
      },
    });
    await prisma.user.delete({ where: { id: userId } });
  },
};

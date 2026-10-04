import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import type { CreateAnnouncementInput } from "./announcements.types";
import type { Prisma, AnnouncementAudience } from "@prisma/client";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

const AUDIENCE_BY_ROLE: Record<string, AnnouncementAudience[]> = {
  TUTOR: ["ALL", "TUTORS"],
  PARENT: ["ALL", "PARENTS"],
  STUDENT: ["ALL", "STUDENTS"],
  BRANCH_ADMIN: ["ALL", "TUTORS", "PARENTS", "STUDENTS", "BRANCH_STAFF"],
};

export const announcementsService = {
  async create(input: CreateAnnouncementInput, actor: Actor) {
    let branchId: string | null;
    if (actor.role === "BRANCH_ADMIN") {
      if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
      branchId = actor.branchId;
    } else {
      // SUPER_ADMIN: omit branchId for an institute-wide announcement, or target one branch.
      branchId = input.branchId ?? null;
    }

    return prisma.announcement.create({
      data: {
        branchId,
        title: input.title,
        body: input.body,
        audience: input.audience,
        category: input.category ?? null,
        publishedById: actor.id,
      },
    });
  },

  /**
   * What each role sees is audience-filtered, not just branch-filtered — a
   * parent never sees a "tutors only" post even if it's for their branch,
   * and everyone sees branch-wide + institute-wide (branchId null) posts.
   * An optional `category` narrows this further (e.g. the Refer pages ask
   * for just "REFERRAL_BONUS" announcements to show as a banner).
   */
  async list(params: { page: number; pageSize: number; category?: string }, actor: Actor) {
    const where: Prisma.AnnouncementWhereInput = {};
    if (params.category) where.category = params.category;

    if (actor.role === "SUPER_ADMIN") {
      // sees everything
    } else if (actor.role === "BRANCH_ADMIN") {
      where.OR = [{ branchId: actor.branchId }, { branchId: null }];
    } else {
      const audiences = AUDIENCE_BY_ROLE[actor.role] ?? ["ALL"];
      where.audience = { in: audiences };
      where.OR = [{ branchId: actor.branchId }, { branchId: null }];
    }

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.announcement.count({ where }),
    ]);
    return { items, total };
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Announcement not found");
    if (actor.role !== "SUPER_ADMIN") {
      if (existing.branchId === null) throw new ValidationError("Only a Super Admin can remove an institute-wide announcement");
      if (existing.branchId !== actor.branchId) throw new ForbiddenError("You don't have access to this branch's data");
    }
    await prisma.announcement.delete({ where: { id } });
  },
};

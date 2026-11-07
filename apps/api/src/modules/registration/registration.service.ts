import { prisma } from "@/common/prisma";
import { NotFoundError, ForbiddenError } from "@/common/errors/AppError";
import type { Prisma } from "@prisma/client";

interface Actor {
  role: string;
  branchId: string | null;
}
interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  branchId?: string;
  status?: "REGISTERED" | "ASSIGNED" | "ACTIVE" | "INACTIVE" | "ALL";
  gender?: "MALE" | "FEMALE" | "OTHER";
  contactNumber?: string;
  education?: string;
  subject?: string;
  from?: Date;
  to?: Date;
}

function effectiveBranchId(actor: Actor, requested: string | undefined) {
  if (actor.role === "BRANCH_ADMIN") return actor.branchId ?? undefined;
  return requested;
}

function statusFilter(status: ListParams["status"]) {
  if (!status) return { status: "REGISTERED" as const };
  if (status === "ALL") return { status: { not: "INACTIVE" as const } };
  return { status };
}

function registeredDateFilter(from: Date | undefined, to: Date | undefined) {
  if (!from && !to) return {};
  return { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
}

export const registrationService = {
  async listTutors(params: ListParams, actor: Actor) {
    const branchId = effectiveBranchId(actor, params.branchId);
    const where: Prisma.TutorWhereInput = {
      ...statusFilter(params.status),
      ...(branchId ? { branchId } : {}),
      ...(params.gender ? { gender: params.gender } : {}),
      ...(params.contactNumber ? { contactNumber: { contains: params.contactNumber } } : {}),
      ...(params.education ? { education: { contains: params.education, mode: "insensitive" } } : {}),
      ...(params.subject ? { subjects: { has: params.subject } } : {}),
      ...registeredDateFilter(params.from, params.to),
      ...(params.search
        ? { OR: [{ name: { contains: params.search, mode: "insensitive" } }, { contactNumber: { contains: params.search } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.tutor.findMany({
        where,
        include: { branch: { select: { id: true, name: true } }, _count: { select: { assignments: true } } },
        orderBy: { name: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.tutor.count({ where }),
    ]);

    // Parent ratings (see ratings.service.ts) — batched once per page
    // rather than once per tutor, same convention as the Document
    // receipt-count lookups elsewhere (e.g. expenses.service.ts).
    const ratingStats = items.length
      ? await prisma.tutorRating.groupBy({ by: ["tutorId"], where: { tutorId: { in: items.map((t) => t.id) } }, _avg: { rating: true }, _count: { _all: true } })
      : [];
    const ratingByTutor = new Map(ratingStats.map((r) => [r.tutorId, { avgRating: r._avg.rating, ratingCount: r._count._all }]));
    const itemsWithRatings = items.map((t) => ({
      ...t,
      avgParentRating: ratingByTutor.get(t.id)?.avgRating ?? null,
      parentRatingCount: ratingByTutor.get(t.id)?.ratingCount ?? 0,
    }));

    return { items: itemsWithRatings, total };
  },

  async getTutor(id: string, actor: Actor) {
    const tutor = await prisma.tutor.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, username: true, status: true, lastLoginAt: true } },
        assignments: { include: { student: { select: { id: true, name: true, studentClass: true } } } },
      },
    });
    if (!tutor) throw new NotFoundError("Tutor not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== tutor.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }
    const ratingAgg = await prisma.tutorRating.aggregate({ where: { tutorId: id }, _avg: { rating: true }, _count: { _all: true } });
    return { ...tutor, avgParentRating: ratingAgg._avg.rating, parentRatingCount: ratingAgg._count._all };
  },

  async listParents(params: ListParams, actor: Actor) {
    const branchId = effectiveBranchId(actor, params.branchId);
    const where: Prisma.ParentWhereInput = {
      ...statusFilter(params.status),
      ...(branchId ? { branchId } : {}),
      ...(params.contactNumber ? { contactNumber: { contains: params.contactNumber } } : {}),
      ...registeredDateFilter(params.from, params.to),
      ...(params.search
        ? { OR: [{ name: { contains: params.search, mode: "insensitive" } }, { contactNumber: { contains: params.search } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.parent.findMany({
        where,
        include: {
        branch: { select: { id: true, name: true } },
        students: { select: { id: true, name: true, studentClass: true, board: true, status: true, preferredTutorGender: true } },
      },
        orderBy: { name: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.parent.count({ where }),
    ]);
    return { items, total };
  },

  async getParent(id: string, actor: Actor) {
    const parent = await prisma.parent.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, username: true, status: true, lastLoginAt: true } },
        students: {
          include: { assignments: { include: { tutor: { select: { id: true, name: true } } } } },
        },
      },
    });
    if (!parent) throw new NotFoundError("Parent not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== parent.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }
    return parent;
  },
};

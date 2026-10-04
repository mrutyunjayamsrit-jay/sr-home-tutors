import { prisma } from "@/common/prisma";
import type { Prisma } from "@prisma/client";
import type { ListUsersQuery } from "./users.types";

const profileIncludes = {
  branch: { select: { id: true, name: true, code: true } },
  tutorProfile: { select: { id: true, name: true } },
  parentProfile: { select: { id: true, name: true } },
  studentProfile: { select: { id: true, name: true } },
} satisfies Prisma.UserInclude;

export const usersRepository = {
  async list(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { username: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: profileIncludes,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  },

  findById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, include: profileIncludes });
  },

  countActiveByRole(role: "SUPER_ADMIN") {
    return prisma.user.count({ where: { role, status: { not: "DISABLED" } } });
  },

  /** Lightweight list for the Student-creation parent picker — no pagination, just enough to populate a dropdown. */
  listParentsForSelect(branchId?: string) {
    return prisma.parent.findMany({
      where: branchId ? { branchId } : undefined,
      select: { id: true, name: true, contactNumber: true, branch: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 500,
    });
  },
};

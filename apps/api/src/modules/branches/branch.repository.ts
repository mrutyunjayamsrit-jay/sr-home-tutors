import { prisma } from "@/common/prisma";
import type { Prisma } from "@prisma/client";

export const branchRepository = {
  create(data: Prisma.BranchCreateInput) {
    return prisma.branch.create({ data });
  },

  findById(id: string) {
    return prisma.branch.findUnique({ where: { id } });
  },

  findByCode(code: string) {
    return prisma.branch.findUnique({ where: { code } });
  },

  async list(params: { page: number; pageSize: number; search?: string; isActive?: boolean }) {
    const where: Prisma.BranchWhereInput = {
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { code: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.branch.count({ where }),
    ]);

    return { items, total };
  },

  update(id: string, data: Prisma.BranchUpdateInput) {
    return prisma.branch.update({ where: { id }, data });
  },
};

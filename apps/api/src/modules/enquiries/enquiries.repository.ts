import { prisma } from "@/common/prisma";
import type { Prisma } from "@prisma/client";

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  branchId?: string;
  createdById?: string;
}

export const enquiriesRepository = {
  // ── Tutor enquiries ──────────────────────────────────────────────────
  async listTutorEnquiries(params: ListParams) {
    const where: Prisma.TutorEnquiryWhereInput = {
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.createdById ? { createdById: params.createdById } : {}),
      ...(params.status ? { status: params.status as Prisma.EnumEnquiryStatusFilter["equals"] } : {}),
      ...(params.search
        ? { OR: [{ name: { contains: params.search, mode: "insensitive" } }, { contactNumber: { contains: params.search } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.tutorEnquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.tutorEnquiry.count({ where }),
    ]);
    return { items, total };
  },

  findTutorEnquiry(id: string) {
    return prisma.tutorEnquiry.findUnique({ where: { id }, include: { tutor: { select: { id: true } } } });
  },

  createTutorEnquiry(data: Prisma.TutorEnquiryUncheckedCreateInput) {
    return prisma.tutorEnquiry.create({ data });
  },

  updateTutorEnquiry(id: string, data: Prisma.TutorEnquiryUncheckedUpdateInput) {
    return prisma.tutorEnquiry.update({ where: { id }, data });
  },

  // ── Parent enquiries ─────────────────────────────────────────────────
  async listParentEnquiries(params: ListParams) {
    const where: Prisma.ParentEnquiryWhereInput = {
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.createdById ? { createdById: params.createdById } : {}),
      ...(params.status ? { status: params.status as Prisma.EnumEnquiryStatusFilter["equals"] } : {}),
      ...(params.search
        ? {
            OR: [
              { studentName: { contains: params.search, mode: "insensitive" } },
              { contactNumber: { contains: params.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.parentEnquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.parentEnquiry.count({ where }),
    ]);
    return { items, total };
  },

  findParentEnquiry(id: string) {
    return prisma.parentEnquiry.findUnique({ where: { id }, include: { parent: { select: { id: true } } } });
  },

  createParentEnquiry(data: Prisma.ParentEnquiryUncheckedCreateInput) {
    return prisma.parentEnquiry.create({ data });
  },

  updateParentEnquiry(id: string, data: Prisma.ParentEnquiryUncheckedUpdateInput) {
    return prisma.parentEnquiry.update({ where: { id }, data });
  },
};

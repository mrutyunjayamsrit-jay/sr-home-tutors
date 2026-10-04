import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import type { CreateExpenseInput } from "./expenses.types";
import type { Prisma } from "@prisma/client";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

function resolveBranchIdForCreate(actor: Actor, requested: string | undefined): string {
  if (actor.role === "BRANCH_ADMIN") {
    if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
    return actor.branchId;
  }
  if (!requested) throw new ValidationError("branchId is required for Super Admin");
  return requested;
}

export const expensesService = {
  async create(input: CreateExpenseInput, actor: Actor) {
    const branchId = resolveBranchIdForCreate(actor, input.branchId);
    return prisma.expense.create({
      data: {
        branchId,
        category: input.category,
        description: input.description,
        amount: input.amount,
        expenseDate: input.expenseDate,
        createdById: actor.id,
      },
    });
  },

  async list(
    params: { page: number; pageSize: number; branchId?: string; category?: string; from?: Date; to?: Date },
    actor: Actor,
  ) {
    const branchId = actor.role === "BRANCH_ADMIN" ? actor.branchId ?? undefined : params.branchId;
    const where: Prisma.ExpenseWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.from || params.to
        ? { expenseDate: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
        : {}),
    };
    const [items, total, sumResult] = await Promise.all([
      prisma.expense.findMany({
        where,
        // No filter for Super Admin means "every branch" — include which
        // branch each row belongs to so that view is actually legible.
        include: actor.role === "SUPER_ADMIN" ? { branch: { select: { id: true, name: true } } } : undefined,
        orderBy: { expenseDate: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    // Document is polymorphic-by-convention (see schema.prisma), so this is
    // a second query rather than a real join — batched once per page
    // instead of once per row, so the receipt indicator never costs an N+1.
    const receiptCounts = items.length
      ? await prisma.document.groupBy({
          by: ["ownerId"],
          where: { ownerType: "EXPENSE", ownerId: { in: items.map((e) => e.id) } },
          _count: { _all: true },
        })
      : [];
    const receiptCountByExpense = new Map(receiptCounts.map((r) => [r.ownerId, r._count._all]));
    const itemsWithReceipts = items.map((e) => ({ ...e, receiptCount: receiptCountByExpense.get(e.id) ?? 0 }));

    return { items: itemsWithReceipts, total, totalAmount: Number(sumResult._sum.amount ?? 0) };
  },

  async remove(id: string, actor: Actor) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError("Expense not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== expense.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }
    await prisma.expense.delete({ where: { id } });
  },
};

import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import { assertParentOwnsStudent, getOwnChildIds } from "@/common/access/family";
import type { CreateInvoiceInput, CreateRateCardInput, RecordPaymentInput } from "./fees.types";
import type { Prisma } from "@prisma/client";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
  profileId?: string;
}

function resolveBranchIdForCreate(actor: Actor, requested: string | undefined): string {
  if (actor.role === "BRANCH_ADMIN") {
    if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
    return actor.branchId;
  }
  if (!requested) throw new ValidationError("branchId is required for Super Admin");
  return requested;
}

export const feesService = {
  // ── Rate cards ──────────────────────────────────────────────────────
  async createRateCard(input: CreateRateCardInput, actor: Actor) {
    const branchId = resolveBranchIdForCreate(actor, input.branchId);
    return prisma.feeRateCard.create({
      data: {
        branchId,
        board: input.board,
        classCategory: input.classCategory,
        ratePerClass: input.ratePerClass,
        billingCycle: input.billingCycle,
        createdById: actor.id,
      },
    });
  },

  async listRateCards(params: { branchId?: string; board?: string }, actor: Actor) {
    const branchId = actor.role === "BRANCH_ADMIN" ? actor.branchId ?? undefined : params.branchId;
    return prisma.feeRateCard.findMany({
      where: { ...(branchId ? { branchId } : {}), ...(params.board ? { board: params.board as Prisma.EnumBoardFilter["equals"] } : {}) },
      // No branchId filter for Super Admin means "every branch" — include
      // which branch each row belongs to so that view is actually legible.
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { board: "asc" }, { classCategory: "asc" }],
    });
  },

  async deleteRateCard(id: string, actor: Actor) {
    const card = await prisma.feeRateCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundError("Rate card not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== card.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }
    await prisma.feeRateCard.delete({ where: { id } });
  },

  // ── Invoices ────────────────────────────────────────────────────────
  async createInvoice(input: CreateInvoiceInput, actor: Actor) {
    const student = await prisma.student.findUnique({ where: { id: input.studentId }, include: { parent: true } });
    if (!student) throw new NotFoundError("Student not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== student.parent.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }

    return prisma.studentFeeInvoice.create({
      data: {
        studentId: input.studentId,
        period: input.period,
        fixedClasses: input.fixedClasses,
        classesTaken: 0,
        fixedFees: input.fixedFees,
        payableFees: input.fixedFees,
        paidAmount: 0,
        balance: input.fixedFees,
        dueDate: input.dueDate,
        status: "PENDING",
      },
    });
  },

  async listInvoices(
    params: { page: number; pageSize: number; branchId?: string; studentId?: string; status?: string; search?: string },
    actor: Actor,
  ) {
    // A parent only ever sees their own children's invoices — never
    // resolved from branchId/search like the office views below.
    let studentScope: Prisma.StudentFeeInvoiceWhereInput;
    if (actor.role === "PARENT") {
      if (params.studentId) {
        await assertParentOwnsStudent(actor.profileId, params.studentId);
        studentScope = { studentId: params.studentId };
      } else {
        const childIds = await getOwnChildIds(actor.profileId);
        studentScope = { studentId: { in: childIds } };
      }
    } else {
      studentScope = params.studentId ? { studentId: params.studentId } : {};
    }

    const branchId = actor.role === "BRANCH_ADMIN" ? actor.branchId ?? undefined : params.branchId;
    const where: Prisma.StudentFeeInvoiceWhereInput = {
      ...studentScope,
      ...(params.status ? { status: params.status as Prisma.EnumInvoiceStatusFilter["equals"] } : {}),
      ...(actor.role !== "PARENT" && branchId ? { student: { parent: { branchId } } } : {}),
      ...(actor.role !== "PARENT" && params.search ? { student: { name: { contains: params.search, mode: "insensitive" } } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.studentFeeInvoice.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentClass: true,
              parent: { select: { name: true, contactNumber: true, branch: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.studentFeeInvoice.count({ where }),
    ]);

    // Document is polymorphic-by-convention (see schema.prisma), so this is
    // a second query rather than a real join — batched once per page
    // instead of once per row, so the payment-proof indicator never costs
    // an N+1.
    const proofCounts = items.length
      ? await prisma.document.groupBy({
          by: ["ownerId"],
          where: { ownerType: "STUDENT_FEE_INVOICE", ownerId: { in: items.map((i) => i.id) } },
          _count: { _all: true },
        })
      : [];
    const proofCountByInvoice = new Map(proofCounts.map((r) => [r.ownerId, r._count._all]));
    const itemsWithProof = items.map((i) => ({ ...i, proofCount: proofCountByInvoice.get(i.id) ?? 0 }));

    return { items: itemsWithProof, total };
  },

  async recordPayment(id: string, input: RecordPaymentInput, actor: Actor) {
    const invoice = await prisma.studentFeeInvoice.findUnique({ where: { id }, include: { student: { include: { parent: true } } } });
    if (!invoice) throw new NotFoundError("Invoice not found");
    if (actor.role !== "SUPER_ADMIN" && actor.branchId !== invoice.student.parent.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }

    const newPaidAmount = Number(invoice.paidAmount) + input.amount;
    const payableFees = Number(invoice.payableFees);
    if (newPaidAmount > payableFees + 0.01) {
      throw new ValidationError(`Payment of ${input.amount} exceeds the remaining balance of ${payableFees - Number(invoice.paidAmount)}`);
    }
    const balance = Math.max(0, Math.round((payableFees - newPaidAmount) * 100) / 100);
    const status = balance <= 0 ? "PAID" : "PARTIAL";

    return prisma.studentFeeInvoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        balance,
        status,
        paidAt: input.paidAt ?? new Date(),
        paymentMethod: input.paymentMethod,
      },
    });
  },
};

import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import {
  notifyParentQueryToBranch,
  notifyParentQueryToSuperAdmin,
  notifyParentQueryAnswered,
} from "@/modules/notifications/notifications.service";
import type { CreateParentQueryInput, AnswerParentQueryInput, ListParentQueriesQuery } from "./parent-queries.types";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

function assertAnswerAccess(actor: Actor, query: { branchId: string; target: string }) {
  if (actor.role === "SUPER_ADMIN") return; // Super Admin can answer anything — same oversight as elsewhere
  if (actor.role !== "BRANCH_ADMIN") throw new ForbiddenError("Only the branch office or Super Admin can answer a query");
  if (query.target !== "BRANCH") throw new ForbiddenError("This query was addressed to Super Admin");
  if (actor.branchId !== query.branchId) throw new ForbiddenError("You don't have access to this branch's data");
}

/** Batches a name/contact lookup for the parents who asked a page of queries — askedById is a loose id (same convention as Task.createdById), not a formal relation. */
async function attachAskedBy<T extends { askedById: string }>(items: T[]) {
  const ids = [...new Set(items.map((i) => i.askedById))];
  if (ids.length === 0) return items.map((i) => ({ ...i, askedBy: null }));
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, parentProfile: { select: { name: true, contactNumber: true } } },
  });
  const byId = new Map(users.map((u) => [u.id, u.parentProfile]));
  return items.map((i) => ({ ...i, askedBy: byId.get(i.askedById) ?? null }));
}

export const parentQueriesService = {
  /** Parent only (enforced at the route) — always forced onto their own branch, regardless of target. */
  async create(input: CreateParentQueryInput, actor: Actor) {
    if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");

    const query = await prisma.parentQuery.create({
      data: {
        branchId: actor.branchId,
        askedById: actor.id,
        target: input.target,
        subject: input.subject,
        message: input.message,
        status: "OPEN",
      },
    });

    if (input.target === "BRANCH") {
      await notifyParentQueryToBranch(actor.branchId, query);
    } else {
      await notifyParentQueryToSuperAdmin(query);
    }

    return query;
  },

  /**
   * A parent sees only their own queries (any target); a Branch Admin sees
   * only BRANCH-targeted queries for their own branch; Super Admin sees
   * everything, optionally filtered.
   */
  async list(params: ListParentQueriesQuery, actor: Actor) {
    const where: {
      askedById?: string;
      branchId?: string;
      target?: "BRANCH" | "SUPER_ADMIN";
      status?: "OPEN" | "ANSWERED";
    } = {};

    if (actor.role === "PARENT") {
      where.askedById = actor.id;
    } else if (actor.role === "BRANCH_ADMIN") {
      if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
      where.branchId = actor.branchId;
      where.target = "BRANCH";
    } else {
      // SUPER_ADMIN
      if (params.branchId) where.branchId = params.branchId;
      if (params.target) where.target = params.target;
    }
    if (params.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.parentQuery.findMany({
        where,
        include: actor.role !== "PARENT" ? { branch: { select: { id: true, name: true } } } : undefined,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.parentQuery.count({ where }),
    ]);

    const items = actor.role === "PARENT" ? rows : await attachAskedBy(rows);
    return { items, total };
  },

  /** Branch Admin (their own branch, BRANCH-targeted only) or Super Admin (any) — sets the answer and notifies the parent. */
  async answer(id: string, input: AnswerParentQueryInput, actor: Actor) {
    const query = await prisma.parentQuery.findUnique({ where: { id } });
    if (!query) throw new NotFoundError("Query not found");
    assertAnswerAccess(actor, query);
    if (query.status === "ANSWERED") throw new ValidationError("This query has already been answered");

    const updated = await prisma.parentQuery.update({
      where: { id },
      data: { answer: input.answer, status: "ANSWERED", answeredById: actor.id, answeredAt: new Date() },
    });

    await notifyParentQueryAnswered(query.askedById, updated);
    return updated;
  },
};

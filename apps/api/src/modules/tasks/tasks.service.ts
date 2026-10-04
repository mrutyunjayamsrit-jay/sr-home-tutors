import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError } from "@/common/errors/AppError";
import { notifyTaskAssigned, notifyTaskCompleted } from "@/modules/notifications/notifications.service";
import type { CreateTaskInput, ListTasksQuery } from "./tasks.types";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

function assertBranchAccess(actor: Actor, taskBranchId: string) {
  if (actor.role === "SUPER_ADMIN") return;
  if (actor.branchId !== taskBranchId) {
    throw new ForbiddenError("You don't have access to this branch's data");
  }
}

export const tasksService = {
  /** Super Admin only (enforced at the route) — assigns a task to exactly one branch. */
  async create(input: CreateTaskInput, actor: Actor) {
    const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) throw new NotFoundError("Branch not found");

    const task = await prisma.task.create({
      data: {
        branchId: input.branchId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        createdById: actor.id,
      },
    });

    await notifyTaskAssigned(input.branchId, task);
    return task;
  },

  /** A Branch Admin only ever sees their own branch's tasks; Super Admin sees any (optionally filtered). */
  async list(params: ListTasksQuery, actor: Actor) {
    const branchId = actor.role === "BRANCH_ADMIN" ? actor.branchId ?? undefined : params.branchId;
    const where = {
      ...(branchId ? { branchId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: actor.role === "SUPER_ADMIN" ? { branch: { select: { id: true, name: true } } } : undefined,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.task.count({ where }),
    ]);
    return { items, total };
  },

  /** Branch Admin (their own branch) or Super Admin — idempotent, so a double-click never double-notifies. */
  async complete(id: string, actor: Actor) {
    const task = await prisma.task.findUnique({ where: { id }, include: { branch: { select: { name: true } } } });
    if (!task) throw new NotFoundError("Task not found");
    assertBranchAccess(actor, task.branchId);

    if (task.status === "COMPLETED") return task;

    const updated = await prisma.task.update({
      where: { id },
      data: { status: "COMPLETED", completedById: actor.id, completedAt: new Date() },
    });

    await notifyTaskCompleted(updated, task.branch.name);
    return updated;
  },

  /** Super Admin only — removes a task they no longer want tracked. */
  async remove(id: string, actor: Actor) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundError("Task not found");
    if (actor.role !== "SUPER_ADMIN") throw new ForbiddenError("Only Super Admin can remove a task");
    await prisma.task.delete({ where: { id } });
  },
};

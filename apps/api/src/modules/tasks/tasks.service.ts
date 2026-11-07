import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
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
  /**
   * Either direction creates the same row shape, just with the opposite
   * `direction` and whose branch it's scoped to: Super Admin assigns a
   * task to a branch they pick (TO_BRANCH), or a Branch Admin raises one
   * for Super Admin's attention, always scoped to their own branch
   * (TO_SUPER_ADMIN) — their own branchId is forced regardless of what
   * the client sends, same convention as resolveBranchIdForCreate
   * elsewhere (e.g. expenses.service.ts).
   */
  async create(input: CreateTaskInput, actor: Actor) {
    const isBranchAdmin = actor.role === "BRANCH_ADMIN";
    if (isBranchAdmin && !actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
    const branchId = isBranchAdmin ? actor.branchId! : input.branchId;
    if (!branchId) throw new ValidationError("branchId is required");

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundError("Branch not found");

    const direction = isBranchAdmin ? ("TO_SUPER_ADMIN" as const) : ("TO_BRANCH" as const);
    const task = await prisma.task.create({
      data: {
        branchId,
        title: input.title,
        description: input.description,
        assignedDate: input.assignedDate ?? new Date(),
        dueDate: input.dueDate,
        direction,
        createdById: actor.id,
      },
    });

    if (direction === "TO_BRANCH") await notifyTaskAssigned(branchId, task);
    return task;
  },

  /** A Branch Admin only ever sees their own branch's tasks (both directions, unless filtered); Super Admin sees any (optionally filtered). */
  async list(params: ListTasksQuery, actor: Actor) {
    const branchId = actor.role === "BRANCH_ADMIN" ? actor.branchId ?? undefined : params.branchId;
    const where = {
      ...(branchId ? { branchId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.direction ? { direction: params.direction } : {}),
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

  /**
   * Whoever the task is assigned TO marks it complete — a Branch Admin for
   * a TO_BRANCH task Super Admin sent them, Super Admin for a
   * TO_SUPER_ADMIN task a branch raised. Super Admin can also complete any
   * TO_BRANCH task across branches (oversight), but a Branch Admin can
   * never complete their own TO_SUPER_ADMIN request — that's not theirs to
   * close out. Idempotent, so a double-click never double-notifies.
   */
  async complete(id: string, actor: Actor) {
    const task = await prisma.task.findUnique({ where: { id }, include: { branch: { select: { name: true } } } });
    if (!task) throw new NotFoundError("Task not found");
    assertBranchAccess(actor, task.branchId);
    if (actor.role === "BRANCH_ADMIN" && task.direction !== "TO_BRANCH") {
      throw new ForbiddenError("Only Super Admin can mark this task complete");
    }

    if (task.status === "COMPLETED") return task;

    const updated = await prisma.task.update({
      where: { id },
      data: { status: "COMPLETED", completedById: actor.id, completedAt: new Date() },
    });

    if (task.direction === "TO_BRANCH") await notifyTaskCompleted(updated, task.branch.name);
    return updated;
  },

  /** Super Admin can remove any task; a Branch Admin can only withdraw their own still-pending request to Super Admin. */
  async remove(id: string, actor: Actor) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundError("Task not found");
    if (actor.role === "SUPER_ADMIN") {
      await prisma.task.delete({ where: { id } });
      return;
    }
    if (actor.role === "BRANCH_ADMIN" && task.direction === "TO_SUPER_ADMIN" && task.createdById === actor.id && task.status === "PENDING") {
      await prisma.task.delete({ where: { id } });
      return;
    }
    throw new ForbiddenError("You can't remove this task");
  },
};

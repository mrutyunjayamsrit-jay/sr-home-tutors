import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError } from "@/common/errors/AppError";
import { assertParentOwnsStudent, getOwnChildIds } from "@/common/access/family";
import type { CreateTestResultInput } from "./tests.types";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
  profileId?: string;
}

async function assertAssignmentAccess(actor: Actor, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { branchId: true, tutorId: true, studentId: true } });
  if (!assignment) throw new NotFoundError("Assignment not found");
  if (actor.role === "SUPER_ADMIN") return assignment;
  if (actor.role === "TUTOR") {
    if (assignment.tutorId !== actor.profileId) throw new ForbiddenError("This isn't one of your assignments");
    return assignment;
  }
  if (actor.role === "PARENT") {
    await assertParentOwnsStudent(actor.profileId, assignment.studentId);
    return assignment;
  }
  if (actor.branchId !== assignment.branchId) throw new ForbiddenError("You don't have access to this branch's data");
  return assignment;
}

export const testsService = {
  /**
   * Test/mark entry is a tutor's own record-keeping — they conduct the
   * test, they enter the marks. Office/admin roles can view for oversight
   * (a parent-facing report will read this later) but the write path is
   * tutor-owned, scoped to their own assignment.
   */
  async create(input: CreateTestResultInput, actor: Actor) {
    await assertAssignmentAccess(actor, input.assignmentId);
    return prisma.testResult.create({
      data: {
        assignmentId: input.assignmentId,
        subject: input.subject,
        topic: input.topic,
        totalMarks: input.totalMarks,
        obtainedMarks: input.obtainedMarks,
        testDate: input.testDate,
        createdById: actor.id,
      },
    });
  },

  async list(params: { assignmentId?: string; studentId?: string }, actor: Actor) {
    if (params.assignmentId) {
      await assertAssignmentAccess(actor, params.assignmentId);
      return prisma.testResult.findMany({ where: { assignmentId: params.assignmentId }, orderBy: { testDate: "desc" } });
    }

    // No specific assignment requested — list across everything the actor can see.
    let where: Record<string, unknown> =
      actor.role === "TUTOR"
        ? { assignment: { tutorId: actor.profileId } }
        : actor.role === "BRANCH_ADMIN"
          ? { assignment: { branchId: actor.branchId ?? undefined } }
          : {};

    if (actor.role === "PARENT") {
      if (params.studentId) {
        await assertParentOwnsStudent(actor.profileId, params.studentId);
        where = { assignment: { studentId: params.studentId } };
      } else {
        const childIds = await getOwnChildIds(actor.profileId);
        where = { assignment: { studentId: { in: childIds } } };
      }
    }

    return prisma.testResult.findMany({
      where,
      include: {
        assignment: {
          select: { id: true, subjects: true, tutor: { select: { id: true, name: true } }, student: { select: { id: true, name: true, studentClass: true } } },
        },
      },
      orderBy: { testDate: "desc" },
      take: 200,
    });
  },

  async update(id: string, input: Partial<CreateTestResultInput>, actor: Actor) {
    const existing = await prisma.testResult.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Test result not found");
    await assertAssignmentAccess(actor, existing.assignmentId);
    return prisma.testResult.update({
      where: { id },
      data: {
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.topic !== undefined ? { topic: input.topic } : {}),
        ...(input.totalMarks !== undefined ? { totalMarks: input.totalMarks } : {}),
        ...(input.obtainedMarks !== undefined ? { obtainedMarks: input.obtainedMarks } : {}),
        ...(input.testDate !== undefined ? { testDate: input.testDate } : {}),
      },
    });
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.testResult.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Test result not found");
    await assertAssignmentAccess(actor, existing.assignmentId);
    await prisma.testResult.delete({ where: { id } });
  },
};

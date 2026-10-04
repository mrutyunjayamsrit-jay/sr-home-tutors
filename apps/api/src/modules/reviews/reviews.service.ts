import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import { assertParentOwnsStudent } from "@/common/access/family";
import type { CreateReviewInput } from "./reviews.types";

interface Actor {
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

export const reviewsService = {
  async create(input: CreateReviewInput, actor: Actor) {
    await assertAssignmentAccess(actor, input.assignmentId);
    if (!input.strengths && !input.weaknesses && !input.overallReview) {
      throw new ValidationError("Add at least one of strengths, weaknesses, or an overall review");
    }
    return prisma.tutorStudentReview.create({
      data: {
        assignmentId: input.assignmentId,
        strengths: input.strengths,
        weaknesses: input.weaknesses,
        overallReview: input.overallReview,
      },
    });
  },

  async list(assignmentId: string, actor: Actor) {
    await assertAssignmentAccess(actor, assignmentId);
    return prisma.tutorStudentReview.findMany({ where: { assignmentId }, orderBy: { reviewedAt: "desc" } });
  },
};

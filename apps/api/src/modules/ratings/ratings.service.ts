import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError } from "@/common/errors/AppError";
import { assertParentOwnsStudent } from "@/common/access/family";
import type { RateTutorInput } from "./ratings.types";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
  profileId?: string;
}

async function loadAssignmentForParent(assignmentId: string, actor: Actor) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, tutorId: true, studentId: true, branchId: true },
  });
  if (!assignment) throw new NotFoundError("Assignment not found");
  await assertParentOwnsStudent(actor.profileId, assignment.studentId);
  return assignment;
}

export const ratingsService = {
  /** Office roles see any rating in their scope; a parent only their own child's. Never exposed to the tutor being rated. */
  async getForAssignment(assignmentId: string, actor: Actor) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, branchId: true, studentId: true },
    });
    if (!assignment) throw new NotFoundError("Assignment not found");

    if (actor.role === "PARENT") {
      await assertParentOwnsStudent(actor.profileId, assignment.studentId);
    } else if (actor.role !== "SUPER_ADMIN") {
      if (actor.branchId !== assignment.branchId) throw new ForbiddenError("You don't have access to this branch's data");
    }

    return prisma.tutorRating.findUnique({ where: { assignmentId } });
  },

  /** Parent-only — rates the tutor currently assigned to their child, based on the child's actual progress. Upserts, so the rating stays current as progress continues rather than piling up a dated log. */
  async rate(assignmentId: string, input: RateTutorInput, actor: Actor) {
    if (actor.role !== "PARENT") throw new ForbiddenError("Only a parent can rate a tutor");
    const assignment = await loadAssignmentForParent(assignmentId, actor);

    return prisma.tutorRating.upsert({
      where: { assignmentId },
      update: { rating: input.rating, comment: input.comment, ratedById: actor.id },
      create: {
        assignmentId,
        tutorId: assignment.tutorId,
        rating: input.rating,
        comment: input.comment,
        ratedById: actor.id,
      },
    });
  },
};

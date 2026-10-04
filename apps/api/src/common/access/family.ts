import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError } from "@/common/errors/AppError";

/**
 * Shared by every module a parent can read (attendance, tests, reviews,
 * fees, documents, assignments) — a parent's access is never "their
 * branch," only "their own children," verified against a real Student row
 * every time rather than trusted from the client. Centralized so this
 * check can't drift or be forgotten in any one module.
 */
export async function assertParentOwnsStudent(parentProfileId: string | undefined, studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { parentId: true } });
  if (!student) throw new NotFoundError("Student not found");
  if (!parentProfileId || student.parentId !== parentProfileId) {
    throw new ForbiddenError("This isn't your child's record");
  }
  return student;
}

/** All of a parent's own children's IDs — used when a query isn't scoped to one specific child (e.g. "all my kids' upcoming classes"). */
export async function getOwnChildIds(parentProfileId: string | undefined): Promise<string[]> {
  if (!parentProfileId) return [];
  const rows = await prisma.student.findMany({ where: { parentId: parentProfileId }, select: { id: true } });
  return rows.map((r) => r.id);
}

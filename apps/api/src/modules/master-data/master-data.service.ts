import { prisma } from "@/common/prisma";
import { ConflictError, NotFoundError } from "@/common/errors/AppError";
import type { CreateAreaInput, CreateSubjectInput } from "./master-data.types";

interface Actor {
  role: string;
  branchId: string | null;
}

// Common subjects taught right up through Class 12 — lazily seeded (same
// "materialize on read" convention as notifications.service.ts's reminder
// scans) the first time the list is ever read empty, so the tutor/parent
// enquiry forms' "Choose subjects" picker isn't stuck with nothing
// selectable before Super Admin has added anything. Super Admin can freely
// rename/remove/add to these afterward — this only ever fires once.
const DEFAULT_SUBJECTS = ["English", "Hindi", "Kannada", "Maths", "Physics", "Science"];

export const masterDataService = {
  // ── Subjects ────────────────────────────────────────────────────────
  async listSubjects() {
    const existing = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    if (existing.length > 0) return existing;

    await prisma.subject.createMany({ data: DEFAULT_SUBJECTS.map((name) => ({ name })), skipDuplicates: true });
    return prisma.subject.findMany({ orderBy: { name: "asc" } });
  },

  async createSubject(input: CreateSubjectInput) {
    const existing = await prisma.subject.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(`"${input.name}" is already in the subjects list`);
    return prisma.subject.create({ data: { name: input.name } });
  },

  async deleteSubject(id: string) {
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundError("Subject not found");
    await prisma.subject.delete({ where: { id } });
  },

  // ── Areas ───────────────────────────────────────────────────────────
  /** A Branch Admin/Tutor/Parent without an explicit branchId sees only their own branch's areas; Super Admin with no filter sees every branch's. */
  listAreas(params: { branchId?: string }, actor: Actor) {
    const branchId =
      actor.role === "BRANCH_ADMIN" || actor.role === "TUTOR" || actor.role === "PARENT"
        ? actor.branchId ?? undefined
        : params.branchId;
    return prisma.area.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    });
  },

  async createArea(input: CreateAreaInput) {
    const existing = await prisma.area.findUnique({ where: { branchId_name: { branchId: input.branchId, name: input.name } } });
    if (existing) throw new ConflictError(`"${input.name}" is already in this branch's areas list`);
    return prisma.area.create({ data: { branchId: input.branchId, name: input.name } });
  },

  async deleteArea(id: string) {
    const area = await prisma.area.findUnique({ where: { id } });
    if (!area) throw new NotFoundError("Area not found");
    await prisma.area.delete({ where: { id } });
  },
};

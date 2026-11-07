import { prisma } from "@/common/prisma";
import { ConflictError, NotFoundError } from "@/common/errors/AppError";
import { haversineDistanceMeters } from "@/common/utils/geo";
import { geocodeAreaInKarnataka } from "@/common/utils/geocode";
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
  /**
   * A Branch Admin/Tutor/Parent without an explicit branchId sees only
   * their own branch's areas; Super Admin with no filter sees every
   * branch's. Each row also gets `distanceKm` — the great-circle distance
   * from the area to its own branch — computed live from both sides'
   * latitude/longitude whenever both are set, and `null` otherwise (never
   * a guessed number; see common/utils/geo.ts).
   */
  async listAreas(params: { branchId?: string; search?: string }, actor: Actor) {
    const branchId =
      actor.role === "BRANCH_ADMIN" || actor.role === "TUTOR" || actor.role === "PARENT"
        ? actor.branchId ?? undefined
        : params.branchId;
    const areas = await prisma.area.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(params.search ? { name: { contains: params.search, mode: "insensitive" } } : {}),
      },
      include: { branch: { select: { id: true, name: true, latitude: true, longitude: true } } },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    });

    return areas.map((a) => ({
      ...a,
      distanceKm:
        a.latitude != null && a.longitude != null && a.branch.latitude != null && a.branch.longitude != null
          ? Math.round((haversineDistanceMeters(a.branch.latitude, a.branch.longitude, a.latitude, a.longitude) / 1000) * 10) / 10
          : null,
    }));
  },

  async createArea(input: CreateAreaInput) {
    const existing = await prisma.area.findUnique({ where: { branchId_name: { branchId: input.branchId, name: input.name } } });
    if (existing) throw new ConflictError(`"${input.name}" is already in this branch's areas list`);
    return prisma.area.create({
      data: { branchId: input.branchId, name: input.name, latitude: input.latitude, longitude: input.longitude },
    });
  },

  async deleteArea(id: string) {
    const area = await prisma.area.findUnique({ where: { id } });
    if (!area) throw new NotFoundError("Area not found");
    await prisma.area.delete({ where: { id } });
  },

  /** Looks up an area name's coordinates, restricted to Karnataka — see common/utils/geocode.ts. Null means no confident Karnataka match, not an error. */
  async geocodeArea(name: string) {
    return geocodeAreaInKarnataka(name);
  },
};

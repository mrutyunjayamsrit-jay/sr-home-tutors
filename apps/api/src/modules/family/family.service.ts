import { prisma } from "@/common/prisma";
import { ValidationError } from "@/common/errors/AppError";
import { assertParentOwnsStudent } from "@/common/access/family";
import type { UpdateMyLocationInput } from "./family.types";

interface Actor {
  role: string;
  profileId?: string;
}

export const familyService = {
  /** Every child belonging to the signed-in parent — the data behind the child switcher. */
  async listChildren(actor: Actor) {
    return prisma.student.findMany({
      where: { parentId: actor.profileId },
      select: {
        id: true,
        name: true,
        studentClass: true,
        board: true,
        status: true,
        classStartedAt: true,
        subjectsNeeded: true,
        preferredTutorGender: true,
      },
      orderBy: { name: "asc" },
    });
  },

  /**
   * Rich profile for one child: the source spec's parent-login view shows
   * course/board, class-started date, and the assigned tutor's
   * qualification/contact/address alongside the child's own info — this
   * assembles all of it from real Assignment/Tutor rows, one call.
   */
  async getChild(studentId: string, actor: Actor) {
    await assertParentOwnsStudent(actor.profileId, studentId);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parent: { select: { name: true, contactNumber: true } },
        assignments: {
          where: { status: "ACTIVE" },
          include: {
            tutor: {
              select: { id: true, name: true, gender: true, education: true, contactNumber: true, address: true, startedAt: true },
            },
          },
        },
      },
    });

    return student;
  },

  /**
   * The parent's own home location — the more reliable source for
   * location-verified attendance than whatever was (maybe) captured on
   * the public enquiry form, since this is set from the parent's own
   * device at their own home, and can be refreshed any time they move.
   */
  async getMyLocation(actor: Actor) {
    if (!actor.profileId) throw new ValidationError("Your account isn't linked to a parent profile");
    const parent = await prisma.parent.findUnique({
      where: { id: actor.profileId },
      select: { latitude: true, longitude: true, locationUpdatedAt: true },
    });
    return {
      latitude: parent?.latitude != null ? Number(parent.latitude) : null,
      longitude: parent?.longitude != null ? Number(parent.longitude) : null,
      locationUpdatedAt: parent?.locationUpdatedAt ?? null,
    };
  },

  async updateMyLocation(input: UpdateMyLocationInput, actor: Actor) {
    if (!actor.profileId) throw new ValidationError("Your account isn't linked to a parent profile");
    const parent = await prisma.parent.update({
      where: { id: actor.profileId },
      data: { latitude: input.latitude, longitude: input.longitude, locationUpdatedAt: new Date() },
      select: { latitude: true, longitude: true, locationUpdatedAt: true },
    });
    return { latitude: Number(parent.latitude), longitude: Number(parent.longitude), locationUpdatedAt: parent.locationUpdatedAt };
  },
};

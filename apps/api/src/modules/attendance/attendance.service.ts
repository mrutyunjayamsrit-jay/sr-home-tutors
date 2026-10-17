import { prisma } from "@/common/prisma";
import { env } from "@/config/env";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import { assertParentOwnsStudent, getOwnChildIds } from "@/common/access/family";
import { haversineDistanceMeters } from "@/common/utils/geo";
import { areaLooksLikeMatch } from "@/common/utils/textMatch";
import { MIN_CHECKOUT_GAP_MINUTES } from "@/common/constants/attendance";
import { istStartOfDay, istEndOfDay } from "@/common/utils/istDate";
import type { LocationCoordsInput, ManualAreaInput, MarkSessionInput } from "./attendance.types";
import type { Prisma } from "@prisma/client";

interface Actor {
  role: string;
  branchId: string | null;
  profileId?: string;
}

/** Resolves the studentId scope for list-style queries: a specific (ownership-checked) child, all of a parent's children, or unscoped for office roles. */
async function resolveStudentScope(actor: Actor, requestedStudentId: string | undefined): Promise<Prisma.ClassSessionWhereInput> {
  if (actor.role !== "PARENT") return requestedStudentId ? { assignment: { studentId: requestedStudentId } } : {};
  if (requestedStudentId) {
    await assertParentOwnsStudent(actor.profileId, requestedStudentId);
    return { assignment: { studentId: requestedStudentId } };
  }
  const childIds = await getOwnChildIds(actor.profileId);
  return { assignment: { studentId: { in: childIds } } };
}

// IST-aware, not server-local — see common/utils/istDate.ts. "Today"/"this
// date" for a class-attendance listing always means the IST calendar day,
// regardless of what timezone the server process happens to run in.

/**
 * Loads a session for a tutor-initiated check-in/check-out and runs the
 * checks common to both — ownership and that the session is still in play.
 * Deliberately NOT gated on scheduled time at all: per the source
 * requirement, check-in/check-out are enabled purely by the tutor's
 * location, never a clock window (real class timing drifts too much for a
 * fixed window to be useful — that's the whole point of tracking real
 * check-in/check-out times instead of just crediting the scheduled slot).
 */
async function loadSessionForTutorMark(sessionId: string, actor: Actor) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      assignment: {
        select: {
          tutorId: true,
          student: { select: { name: true, parent: { select: { address: true, latitude: true, longitude: true } } } },
        },
      },
    },
  });
  if (!session) throw new NotFoundError("Class session not found");
  if (session.assignment.tutorId !== actor.profileId) throw new ForbiddenError("This isn't one of your classes");
  if (session.status !== "SCHEDULED") {
    throw new ValidationError("This class has already been marked", { reason: "ALREADY_MARKED" });
  }
  return session;
}

/**
 * Enforces the floor on a real check-in→check-out gap — applies wherever
 * the two are paired (a tutor's own check-in/out here, the office's manual
 * entry in mark() below, and a Branch Admin's own daily attendance in
 * staff-attendance.service.ts). Checked before the (costlier) location
 * verification so a too-early attempt fails fast without waiting on GPS.
 */
function assertMinCheckoutGap(checkInAt: Date, checkOutAt: Date) {
  if (checkOutAt <= checkInAt) {
    throw new ValidationError("Check-out must be after check-in", { reason: "CHECKOUT_BEFORE_CHECKIN" });
  }
  const elapsedMinutes = (checkOutAt.getTime() - checkInAt.getTime()) / 60000;
  if (elapsedMinutes < MIN_CHECKOUT_GAP_MINUTES) {
    const remaining = Math.ceil(MIN_CHECKOUT_GAP_MINUTES - elapsedMinutes);
    throw new ValidationError(
      `You can check out ${MIN_CHECKOUT_GAP_MINUTES} minutes after check-in — ${remaining} minute${remaining === 1 ? "" : "s"} left`,
      { reason: "TOO_EARLY_TO_CHECK_OUT", minutesRemaining: remaining },
    );
  }
}

/** Verifies the tutor's device coordinates against the parent's home, or throws with a structured reason the frontend already knows how to render. */
function assertWithinRange(coords: LocationCoordsInput, parent: { latitude: unknown; longitude: unknown }, studentName: string) {
  if (parent.latitude == null || parent.longitude == null) {
    throw new ValidationError(
      `${studentName}'s home location isn't on file yet — enter your area instead, or ask the parent to set it from their dashboard`,
      { reason: "NO_PARENT_LOCATION" },
    );
  }
  const distanceMeters = haversineDistanceMeters(coords.latitude, coords.longitude, Number(parent.latitude), Number(parent.longitude));
  const radius = env.ATTENDANCE_GEOFENCE_RADIUS_METERS;
  if (distanceMeters > radius) {
    throw new ValidationError(`You're ${Math.round(distanceMeters)}m from ${studentName}'s home — must be within ${radius}m here`, {
      reason: "OUT_OF_RANGE",
      distanceMeters: Math.round(distanceMeters),
    });
  }
  return Math.round(distanceMeters);
}

export const attendanceService = {
  async listSessions(
    params: { date?: Date; from?: Date; to?: Date; branchId?: string; assignmentId?: string; status?: string; studentId?: string },
    actor: Actor,
  ) {
    const branchId = actor.role === "BRANCH_ADMIN" ? actor.branchId ?? undefined : params.branchId;
    const range = params.date
      ? { gte: istStartOfDay(params.date), lte: istEndOfDay(params.date) }
      : params.from || params.to
        ? { ...(params.from ? { gte: istStartOfDay(params.from) } : {}), ...(params.to ? { lte: istEndOfDay(params.to) } : {}) }
        : { gte: istStartOfDay(new Date()), lte: istEndOfDay(new Date()) }; // default: today

    const studentScope = await resolveStudentScope(actor, params.studentId);
    // A tutor only ever sees their own sessions — never the rest of the
    // branch's, even though they're in the same branch as their office.
    // NOTE: merged into one `assignment` filter — Prisma's nested-relation
    // filters can't be split across two spread keys of the same name.
    const assignmentFilter: Prisma.AssignmentWhereInput = {
      ...(studentScope.assignment as Prisma.AssignmentWhereInput | undefined),
      ...(actor.role === "TUTOR"
        ? { tutorId: actor.profileId }
        : actor.role !== "PARENT" && branchId
          ? { branchId }
          : {}),
    };
    const where: Prisma.ClassSessionWhereInput = {
      scheduledDate: range,
      ...(params.assignmentId ? { assignmentId: params.assignmentId } : {}),
      ...(params.status ? { status: params.status as Prisma.EnumSessionStatusFilter["equals"] } : {}),
      ...(Object.keys(assignmentFilter).length > 0 ? { assignment: assignmentFilter } : {}),
    };

    return prisma.classSession.findMany({
      where,
      include: {
        assignment: {
          select: {
            id: true,
            subjects: true,
            classDurationMinutes: true,
            tutor: { select: { id: true, name: true } },
            student: { select: { id: true, name: true, studentClass: true } },
          },
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledStart: "asc" }],
    });
  },

  /** Office/tutor manual marking — full editorial control (any status, any time), the always-on fallback behind the gated tutor-initiated paths below. */
  async mark(sessionId: string, input: MarkSessionInput, actor: Actor) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { assignment: { select: { branchId: true, tutorId: true } } },
    });
    if (!session) throw new NotFoundError("Class session not found");

    if (actor.role === "TUTOR") {
      if (session.assignment.tutorId !== actor.profileId) throw new ForbiddenError("This isn't one of your classes");
    } else if (actor.role !== "SUPER_ADMIN" && actor.branchId !== session.assignment.branchId) {
      throw new ForbiddenError("You don't have access to this branch's data");
    }

    let actualDurationMinutes: number | null = null;
    if (input.status === "COMPLETED") {
      if (input.tutorCheckIn && input.tutorCheckOut) {
        assertMinCheckoutGap(input.tutorCheckIn, input.tutorCheckOut);
        actualDurationMinutes = Math.round((input.tutorCheckOut.getTime() - input.tutorCheckIn.getTime()) / 60000);
      } else {
        // No explicit check-in/out given — credit the class's scheduled duration.
        actualDurationMinutes = Math.round((session.scheduledEnd.getTime() - session.scheduledStart.getTime()) / 60000);
      }
    }

    return prisma.classSession.update({
      where: { id: sessionId },
      data: {
        status: input.status,
        tutorCheckIn: input.tutorCheckIn ?? null,
        tutorCheckOut: input.tutorCheckOut ?? null,
        actualDurationMinutes,
        chaptersCovered: input.chaptersCovered,
        topicsCovered: input.topicsCovered,
        markMethod: "MANUAL",
      },
    });
  },

  /**
   * Read-only precheck behind the Check In / Check Out buttons' enabled
   * state — purely location, never a clock window (see
   * loadSessionForTutorMark above). Never throws for anything short of a
   * real access violation: an inconclusive result (no parent location,
   * can't get a fix) still leaves the button enabled, since the dialog's
   * manual-area fallback is the right next step for those.
   */
  async checkProximity(sessionId: string, coords: { latitude: number; longitude: number }, actor: Actor) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          select: {
            tutorId: true,
            student: { select: { parent: { select: { latitude: true, longitude: true } } } },
          },
        },
      },
    });
    if (!session) throw new NotFoundError("Class session not found");
    if (session.assignment.tutorId !== actor.profileId) throw new ForbiddenError("This isn't one of your classes");

    if (session.status !== "SCHEDULED") {
      return { withinRange: false, distanceMeters: null, reason: "ALREADY_MARKED" as const };
    }

    const parent = session.assignment.student.parent;
    if (parent.latitude == null || parent.longitude == null) {
      return { withinRange: false, distanceMeters: null, reason: "NO_PARENT_LOCATION" as const };
    }

    const distanceMeters = Math.round(haversineDistanceMeters(coords.latitude, coords.longitude, Number(parent.latitude), Number(parent.longitude)));
    const withinRange = distanceMeters <= env.ATTENDANCE_GEOFENCE_RADIUS_METERS;
    return { withinRange, distanceMeters, reason: withinRange ? ("IN_RANGE" as const) : ("OUT_OF_RANGE" as const) };
  },

  /**
   * Tutor-facing check-in — the tutor's own GPS, checked against the
   * parent's home location on file. Records the real arrival time in
   * tutorCheckIn; the session stays SCHEDULED (a class "in progress" is
   * just SCHEDULED-with-a-check-in) until checkOutWithLocation/Area closes
   * it out. Falls back to checkInWithArea when the parent has no location
   * on file.
   */
  async checkInWithLocation(sessionId: string, input: LocationCoordsInput, actor: Actor) {
    const session = await loadSessionForTutorMark(sessionId, actor);
    if (session.tutorCheckIn) {
      throw new ValidationError("You've already checked in to this class", { reason: "ALREADY_CHECKED_IN" });
    }

    const parent = session.assignment.student.parent;
    const distanceMeters = assertWithinRange(input, parent, session.assignment.student.name);

    return prisma.classSession.update({
      where: { id: sessionId },
      data: {
        tutorCheckIn: new Date(),
        markMethod: "LOCATION",
        tutorMarkLatitude: input.latitude,
        tutorMarkLongitude: input.longitude,
        tutorMarkDistanceMeters: distanceMeters,
      },
    });
  },

  /** Tutor-facing check-in fallback: typed area, text-checked against the parent's address on file when GPS isn't available. */
  async checkInWithArea(sessionId: string, input: ManualAreaInput, actor: Actor) {
    const session = await loadSessionForTutorMark(sessionId, actor);
    if (session.tutorCheckIn) {
      throw new ValidationError("You've already checked in to this class", { reason: "ALREADY_CHECKED_IN" });
    }

    const parent = session.assignment.student.parent;
    const matched = areaLooksLikeMatch(input.area, parent.address);
    if (!matched && !input.confirmMismatch) {
      throw new ValidationError(
        `"${input.area}" doesn't look like it matches the address on file (${parent.address}). If you're sure you're at the right place, confirm to continue.`,
        { reason: "AREA_MISMATCH", storedAddress: parent.address },
      );
    }

    return prisma.classSession.update({
      where: { id: sessionId },
      data: { tutorCheckIn: new Date(), markMethod: "MANUAL_AREA", manualAreaText: input.area },
    });
  },

  /**
   * Tutor-facing check-out — closes out a class already checked into.
   * actualDurationMinutes is the real tutorCheckOut − tutorCheckIn
   * difference, which is what reports now sum for "hours worked" (see
   * reports.service.ts) instead of crediting the scheduled slot.
   */
  async checkOutWithLocation(sessionId: string, input: LocationCoordsInput, actor: Actor) {
    const session = await loadSessionForTutorMark(sessionId, actor);
    if (!session.tutorCheckIn) {
      throw new ValidationError("Check in before checking out", { reason: "NOT_CHECKED_IN" });
    }
    const tutorCheckOut = new Date();
    assertMinCheckoutGap(session.tutorCheckIn, tutorCheckOut);

    const parent = session.assignment.student.parent;
    assertWithinRange(input, parent, session.assignment.student.name);

    const actualDurationMinutes = Math.round((tutorCheckOut.getTime() - session.tutorCheckIn.getTime()) / 60000);
    return prisma.classSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", tutorCheckOut, actualDurationMinutes },
    });
  },

  /** Tutor-facing check-out fallback: typed area, same text-check as check-in. */
  async checkOutWithArea(sessionId: string, input: ManualAreaInput, actor: Actor) {
    const session = await loadSessionForTutorMark(sessionId, actor);
    if (!session.tutorCheckIn) {
      throw new ValidationError("Check in before checking out", { reason: "NOT_CHECKED_IN" });
    }
    const tutorCheckOut = new Date();
    assertMinCheckoutGap(session.tutorCheckIn, tutorCheckOut);

    const parent = session.assignment.student.parent;
    const matched = areaLooksLikeMatch(input.area, parent.address);
    if (!matched && !input.confirmMismatch) {
      throw new ValidationError(
        `"${input.area}" doesn't look like it matches the address on file (${parent.address}). If you're sure you're at the right place, confirm to continue.`,
        { reason: "AREA_MISMATCH", storedAddress: parent.address },
      );
    }

    const actualDurationMinutes = Math.round((tutorCheckOut.getTime() - session.tutorCheckIn.getTime()) / 60000);
    return prisma.classSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", tutorCheckOut, actualDurationMinutes },
    });
  },
};

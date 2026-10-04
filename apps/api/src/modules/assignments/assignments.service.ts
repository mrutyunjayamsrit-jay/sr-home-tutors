import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import { assertParentOwnsStudent, getOwnChildIds } from "@/common/access/family";
import type { CreateAssignmentInput } from "./assignments.types";
import { buildSessionRows, defaultHorizonEnd } from "./session-generator";
import type { Prisma } from "@prisma/client";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
  profileId?: string;
}

// Used only by create()/updateStatus() — both office-only operations
// (TUTOR/PARENT never reach these routes; see assignments.routes.ts).
// get() uses the more granular assertAssignmentAccess below instead.
function assertBranchAccess(actor: Actor, branchId: string) {
  if (actor.role === "SUPER_ADMIN") return;
  if (actor.branchId !== branchId) throw new ForbiddenError("You don't have access to this branch's data");
}

/** Full access check for a single assignment: branch match for office roles, own-assignment for a tutor, own-child for a parent. */
async function assertAssignmentAccess(actor: Actor, assignment: { branchId: string; tutorId: string; studentId: string }) {
  if (actor.role === "SUPER_ADMIN") return;
  if (actor.role === "TUTOR") {
    if (assignment.tutorId !== actor.profileId) throw new ForbiddenError("This isn't one of your assignments");
    return;
  }
  if (actor.role === "PARENT") {
    await assertParentOwnsStudent(actor.profileId, assignment.studentId);
    return;
  }
  if (actor.branchId !== assignment.branchId) throw new ForbiddenError("You don't have access to this branch's data");
}

/** Resolves the studentId scope for list-style queries: a specific (ownership-checked) child, all of a parent's children, or unscoped for office roles. */
async function resolveStudentScope(actor: Actor, requestedStudentId: string | undefined): Promise<Prisma.AssignmentWhereInput> {
  if (actor.role !== "PARENT") return requestedStudentId ? { studentId: requestedStudentId } : {};
  if (requestedStudentId) {
    await assertParentOwnsStudent(actor.profileId, requestedStudentId);
    return { studentId: requestedStudentId };
  }
  const childIds = await getOwnChildIds(actor.profileId);
  return { studentId: { in: childIds } };
}

export const assignmentsService = {
  /**
   * The "Assign teachers" workflow from the source spec §3.3: pick a
   * registered tutor + registered student, set the schedule/rate, and the
   * system takes it from there — generating the actual class-session
   * calendar (§3.4 "Running classes") rather than leaving attendance
   * tracking to a manually-maintained count.
   */
  async create(input: CreateAssignmentInput, actor: Actor) {
    const [tutor, student] = await Promise.all([
      prisma.tutor.findUnique({ where: { id: input.tutorId } }),
      prisma.student.findUnique({ where: { id: input.studentId }, include: { parent: true } }),
    ]);
    if (!tutor) throw new NotFoundError("Tutor not found");
    if (!student) throw new NotFoundError("Student not found");

    const branchId = tutor.branchId;
    if (student.parent.branchId !== branchId) {
      throw new ValidationError("Tutor and student must belong to the same branch");
    }
    assertBranchAccess(actor, branchId);

    if (input.timeSlotEnd <= input.timeSlotStart) {
      throw new ValidationError("End time must be after start time");
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({
        data: {
          branchId,
          tutorId: input.tutorId,
          studentId: input.studentId,
          subjects: input.subjects,
          perClassRate: input.perClassRate,
          fixedClassesPerMonth: input.fixedClassesPerMonth,
          fixedSalary: input.fixedSalary,
          classDurationMinutes: input.classDurationMinutes,
          daysOfWeek: input.daysOfWeek,
          timeSlotStart: input.timeSlotStart,
          timeSlotEnd: input.timeSlotEnd,
          startDate: input.startDate,
          status: "ACTIVE",
          createdById: actor.id,
        },
      });

      const sessionRows = buildSessionRows(created, defaultHorizonEnd());
      if (sessionRows.length > 0) {
        await tx.classSession.createMany({ data: sessionRows });
      }

      // Move both sides of the match out of the unassigned pool.
      if (tutor.status === "REGISTERED") {
        await tx.tutor.update({ where: { id: tutor.id }, data: { status: "ASSIGNED", startedAt: tutor.startedAt ?? new Date() } });
      }
      if (student.status === "REGISTERED") {
        await tx.student.update({ where: { id: student.id }, data: { status: "ASSIGNED" } });
      }

      return created;
    });

    return assignment;
  },

  async list(params: { page: number; pageSize: number; branchId?: string; status?: string; search?: string; studentId?: string }, actor: Actor) {
    const branchId = actor.role === "BRANCH_ADMIN" ? actor.branchId ?? undefined : params.branchId;
    const studentScope = await resolveStudentScope(actor, params.studentId);
    const where: Prisma.AssignmentWhereInput = {
      ...studentScope,
      ...(actor.role === "TUTOR" ? { tutorId: actor.profileId } : actor.role !== "PARENT" && branchId ? { branchId } : {}),
      ...(params.status ? { status: params.status as Prisma.EnumAssignmentStatusFilter["equals"] } : {}),
      ...(params.search
        ? {
            OR: [
              { tutor: { name: { contains: params.search, mode: "insensitive" } } },
              { student: { name: { contains: params.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          tutor: { select: { id: true, name: true, contactNumber: true, education: true } },
          student: { select: { id: true, name: true, studentClass: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.assignment.count({ where }),
    ]);
    return { items, total };
  },

  async get(id: string, actor: Actor) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        tutor: { select: { id: true, name: true, contactNumber: true, education: true, startedAt: true } },
        student: { select: { id: true, name: true, studentClass: true, board: true, parent: { select: { id: true, name: true, contactNumber: true } } } },
      },
    });
    if (!assignment) throw new NotFoundError("Assignment not found");
    await assertAssignmentAccess(actor, assignment);
    return assignment;
  },

  async updateStatus(id: string, status: "ACTIVE" | "PAUSED" | "ENDED", actor: Actor) {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundError("Assignment not found");
    assertBranchAccess(actor, assignment.branchId);
    return prisma.assignment.update({
      where: { id },
      data: { status, endDate: status === "ENDED" ? new Date() : assignment.endDate },
    });
  },

  /**
   * §3.4 "Running classes" — assigned classes, attended, absent, remaining,
   * and the attendance percentage, computed live from ClassSession so it
   * can never drift from what was actually marked.
   */
  async runningClasses(params: { branchId?: string; search?: string; studentId?: string }, actor: Actor) {
    const branchId = actor.role === "BRANCH_ADMIN" ? actor.branchId ?? undefined : params.branchId;
    const studentScope = await resolveStudentScope(actor, params.studentId);
    const where: Prisma.AssignmentWhereInput = {
      status: "ACTIVE",
      ...studentScope,
      ...(actor.role === "TUTOR" ? { tutorId: actor.profileId } : actor.role !== "PARENT" && branchId ? { branchId } : {}),
      ...(params.search
        ? {
            OR: [
              { tutor: { name: { contains: params.search, mode: "insensitive" } } },
              { student: { name: { contains: params.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        tutor: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
        sessions: { select: { status: true, scheduledDate: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const today = new Date();
    return assignments.map((a) => {
      const pastOrTodaySessions = a.sessions.filter((s) => s.scheduledDate <= today);
      const attended = pastOrTodaySessions.filter((s) => s.status === "COMPLETED").length;
      const absent = pastOrTodaySessions.filter((s) => s.status === "ABSENT_STUDENT" || s.status === "ABSENT_TUTOR").length;
      const totalToDate = pastOrTodaySessions.length;
      const remaining = Math.max(a.fixedClassesPerMonth - totalToDate, 0);
      const denominator = Math.max(totalToDate, 1);
      return {
        id: a.id,
        tutorName: a.tutor.name,
        studentName: a.student.name,
        startedAt: a.startDate,
        fixedClassesPerMonth: a.fixedClassesPerMonth,
        classDurationMinutes: a.classDurationMinutes,
        attended,
        absent,
        remaining,
        // Explicitly capped — the source spec calls out that this must never exceed 100%.
        attendancePercent: Math.min(100, Math.round((attended / denominator) * 100)),
        absentPercent: Math.min(100, Math.round((absent / denominator) * 100)),
      };
    });
  },
};

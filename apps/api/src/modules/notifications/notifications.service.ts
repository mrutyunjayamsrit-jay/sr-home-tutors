import { prisma } from "@/common/prisma";
import { NotFoundError, ForbiddenError } from "@/common/errors/AppError";
import { SHORT_CLASS_ESCALATION_COUNT, SHORT_CLASS_THRESHOLD_MINUTES } from "@/common/constants/attendance";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Same-day reminder for a Branch Admin who hasn't checked in yet —
 * idempotent per (user, day) via dedupeKey, so re-visiting the
 * notifications list all day doesn't spawn duplicates.
 */
async function ensureOwnAttendanceReminder(actor: Actor) {
  const today = startOfDay(new Date());
  const dedupeKey = `attendance-reminder:${actor.id}:${today.toISOString().slice(0, 10)}`;
  const record = await prisma.staffAttendance.findUnique({
    where: { staffUserId_date: { staffUserId: actor.id, date: today } },
  });
  if (record?.loginAt) {
    // Already checked in — clear out any reminder that was raised earlier
    // today before they did, rather than leaving it to sit unread forever.
    await prisma.notification.deleteMany({ where: { dedupeKey } });
    return;
  }

  await prisma.notification.upsert({
    where: { dedupeKey },
    update: {},
    create: {
      userId: actor.id,
      type: "ATTENDANCE_REMINDER",
      title: "Mark your attendance",
      body: `You haven't checked in yet today (${formatDate(today)}).`,
      dedupeKey,
    },
  });
}

/**
 * Escalation to every Super Admin for branches that missed check-in on a
 * recent completed day (looks back up to a week so an admin who doesn't
 * check in daily still catches up on what was missed). One notification
 * per (branch, day, super admin) — idempotent via dedupeKey, so repeated
 * scans across visits never duplicate.
 */
async function ensureBranchMissedEscalations() {
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", status: { not: "DISABLED" } },
    select: { id: true },
  });
  if (superAdmins.length === 0) return;

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, createdAt: true, users: { where: { role: "BRANCH_ADMIN" }, select: { id: true } } },
  });
  if (branches.length === 0) return;

  const today = startOfDay(new Date());
  const LOOKBACK_DAYS = 7;

  for (let i = 1; i <= LOOKBACK_DAYS; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);

    for (const branch of branches) {
      if (branch.users.length === 0) continue; // no admin assigned yet — nothing to expect
      if (startOfDay(branch.createdAt) > day) continue; // branch didn't exist yet on that day

      const anyMarked = await prisma.staffAttendance.findFirst({
        where: { staffUserId: { in: branch.users.map((u) => u.id) }, date: day, loginAt: { not: null } },
        select: { id: true },
      });
      const dateKey = day.toISOString().slice(0, 10);
      if (anyMarked) {
        // The branch backfilled this day after being flagged — clear any
        // escalations already sent so they don't sit around as stale.
        await prisma.notification.deleteMany({ where: { dedupeKey: { startsWith: `branch-attendance-missed:${branch.id}:${dateKey}:` } } });
        continue;
      }

      for (const admin of superAdmins) {
        const dedupeKey = `branch-attendance-missed:${branch.id}:${dateKey}:${admin.id}`;
        await prisma.notification.upsert({
          where: { dedupeKey },
          update: {},
          create: {
            userId: admin.id,
            type: "BRANCH_ATTENDANCE_MISSED",
            title: "Branch attendance missed",
            body: `${branch.name} did not check in on ${formatDate(day)}.`,
            dedupeKey,
          },
        });
      }
    }
  }
}

/**
 * Escalation to every Super Admin for a tutor who has racked up too many
 * unusually short classes this calendar month — real check-in→check-out
 * duration under SHORT_CLASS_THRESHOLD_MINUTES, computed live from
 * ClassSession, never a separately-tracked counter. One notification per
 * (tutor, month, super admin), and the body is refreshed on every scan so
 * the count stays current as more short classes land in the same month.
 */
async function ensureShortClassEscalations() {
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", status: { not: "DISABLED" } },
    select: { id: true },
  });
  if (superAdmins.length === 0) return;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const shortSessions = await prisma.classSession.findMany({
    where: {
      status: "COMPLETED",
      actualDurationMinutes: { lt: SHORT_CLASS_THRESHOLD_MINUTES },
      scheduledDate: { gte: monthStart },
    },
    select: { assignment: { select: { tutorId: true, tutor: { select: { name: true } } } } },
  });

  const byTutor = new Map<string, { name: string; count: number }>();
  for (const session of shortSessions) {
    const { tutorId, tutor } = session.assignment;
    const existing = byTutor.get(tutorId) ?? { name: tutor.name, count: 0 };
    existing.count += 1;
    byTutor.set(tutorId, existing);
  }

  for (const [tutorId, { name, count }] of byTutor) {
    if (count <= SHORT_CLASS_ESCALATION_COUNT) continue;
    const body = `${name} has had ${count} classes under ${SHORT_CLASS_THRESHOLD_MINUTES} minutes this month.`;
    for (const admin of superAdmins) {
      const dedupeKey = `short-classes:${tutorId}:${monthKey}:${admin.id}`;
      await prisma.notification.upsert({
        where: { dedupeKey },
        update: { body },
        create: { userId: admin.id, type: "TUTOR_SHORT_CLASSES", title: "Unusually short classes", body, dedupeKey },
      });
    }
  }
}

/**
 * One-shot notifications for real events (as opposed to the lazily-detected
 * "is this currently true" reminders above) — created directly at the
 * moment they happen, by whichever module owns that event. Idempotent via
 * dedupeKey all the same, since a Branch Admin route can retry.
 */
export async function notifyTaskAssigned(branchId: string, task: { id: string; title: string }) {
  const admins = await prisma.user.findMany({
    where: { branchId, role: "BRANCH_ADMIN", status: { not: "DISABLED" } },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      prisma.notification.upsert({
        where: { dedupeKey: `task-assigned:${task.id}:${admin.id}` },
        update: {},
        create: {
          userId: admin.id,
          type: "TASK_ASSIGNED",
          title: "New task assigned",
          body: `"${task.title}" was assigned to your branch.`,
          dedupeKey: `task-assigned:${task.id}:${admin.id}`,
        },
      }),
    ),
  );
}

export async function notifyTaskCompleted(task: { id: string; title: string }, branchName: string) {
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", status: { not: "DISABLED" } },
    select: { id: true },
  });
  await Promise.all(
    superAdmins.map((admin) =>
      prisma.notification.upsert({
        where: { dedupeKey: `task-completed:${task.id}:${admin.id}` },
        update: {},
        create: {
          userId: admin.id,
          type: "TASK_COMPLETED",
          title: "Task completed",
          body: `${branchName} marked "${task.title}" as complete.`,
          dedupeKey: `task-completed:${task.id}:${admin.id}`,
        },
      }),
    ),
  );
}

/** A parent's query addressed to their branch — notifies every Branch Admin at that branch. */
export async function notifyParentQueryToBranch(branchId: string, query: { id: string; subject: string }) {
  const admins = await prisma.user.findMany({
    where: { branchId, role: "BRANCH_ADMIN", status: { not: "DISABLED" } },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      prisma.notification.upsert({
        where: { dedupeKey: `parent-query-asked:${query.id}:${admin.id}` },
        update: {},
        create: {
          userId: admin.id,
          type: "PARENT_QUERY_ASKED",
          title: "New parent query",
          body: `A parent asked: "${query.subject}"`,
          dedupeKey: `parent-query-asked:${query.id}:${admin.id}`,
        },
      }),
    ),
  );
}

/** A parent's query addressed straight to Super Admin — notifies every Super Admin. */
export async function notifyParentQueryToSuperAdmin(query: { id: string; subject: string }) {
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", status: { not: "DISABLED" } },
    select: { id: true },
  });
  await Promise.all(
    superAdmins.map((admin) =>
      prisma.notification.upsert({
        where: { dedupeKey: `parent-query-asked:${query.id}:${admin.id}` },
        update: {},
        create: {
          userId: admin.id,
          type: "PARENT_QUERY_ASKED",
          title: "New parent query",
          body: `A parent asked: "${query.subject}"`,
          dedupeKey: `parent-query-asked:${query.id}:${admin.id}`,
        },
      }),
    ),
  );
}

/** The office's answer to a parent's query — notifies the parent who asked it. */
export async function notifyParentQueryAnswered(askedById: string, query: { id: string; subject: string }) {
  await prisma.notification.upsert({
    where: { dedupeKey: `parent-query-answered:${query.id}` },
    update: {},
    create: {
      userId: askedById,
      type: "PARENT_QUERY_ANSWERED",
      title: "Your query was answered",
      body: `You have a reply to your query: "${query.subject}"`,
      dedupeKey: `parent-query-answered:${query.id}`,
    },
  });
}

export const notificationsService = {
  async list(params: { page: number; pageSize: number; unreadOnly?: boolean }, actor: Actor) {
    if (actor.role === "BRANCH_ADMIN") await ensureOwnAttendanceReminder(actor);
    if (actor.role === "SUPER_ADMIN") {
      await ensureBranchMissedEscalations();
      await ensureShortClassEscalations();
    }

    const where = { userId: actor.id, ...(params.unreadOnly ? { readAt: null } : {}) };
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
    ]);
    return { items, total, unreadCount };
  },

  async unreadCount(actor: Actor) {
    if (actor.role === "BRANCH_ADMIN") await ensureOwnAttendanceReminder(actor);
    if (actor.role === "SUPER_ADMIN") {
      await ensureBranchMissedEscalations();
      await ensureShortClassEscalations();
    }
    return prisma.notification.count({ where: { userId: actor.id, readAt: null } });
  },

  async markRead(id: string, actor: Actor) {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Notification not found");
    if (existing.userId !== actor.id) throw new ForbiddenError("This isn't your notification");
    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  },

  async markAllRead(actor: Actor) {
    await prisma.notification.updateMany({ where: { userId: actor.id, readAt: null }, data: { readAt: new Date() } });
  },
};

import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import { MIN_CHECKOUT_GAP_MINUTES } from "@/common/constants/attendance";
import { istStartOfDay, istEndOfDay, istFirstOfMonth, istNextDay, istDateKey } from "@/common/utils/istDate";
import type { CheckTimeInput } from "./staff-attendance.types";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

/**
 * Branch-office self-attendance: a Branch Admin checks themselves in/out
 * of the office each day, with the actual time picked (not just "now") so
 * a late entry can reflect when they really arrived. One row per
 * (staff user, day) — check-in and check-out both write into it, never a
 * separate log per tap.
 */
export const staffAttendanceService = {
  async checkIn(input: CheckTimeInput, actor: Actor) {
    if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
    const loginAt = input.at;
    const date = istStartOfDay(loginAt);

    return prisma.staffAttendance.upsert({
      where: { staffUserId_date: { staffUserId: actor.id, date } },
      update: { loginAt, status: "PRESENT" },
      create: { branchId: actor.branchId, staffUserId: actor.id, date, loginAt, status: "PRESENT" },
    });
  },

  async checkOut(input: CheckTimeInput, actor: Actor) {
    if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
    const logoutAt = input.at;
    const date = istStartOfDay(logoutAt);

    const existing = await prisma.staffAttendance.findUnique({ where: { staffUserId_date: { staffUserId: actor.id, date } } });
    if (!existing || !existing.loginAt) {
      throw new ValidationError("Check in before checking out");
    }
    if (logoutAt <= existing.loginAt) {
      throw new ValidationError("Check-out must be after check-in", { reason: "CHECKOUT_BEFORE_CHECKIN" });
    }
    const elapsedMinutes = (logoutAt.getTime() - existing.loginAt.getTime()) / 60000;
    if (elapsedMinutes < MIN_CHECKOUT_GAP_MINUTES) {
      const remaining = Math.ceil(MIN_CHECKOUT_GAP_MINUTES - elapsedMinutes);
      throw new ValidationError(
        `Check-out must be at least ${MIN_CHECKOUT_GAP_MINUTES} minutes after check-in — ${remaining} minute${remaining === 1 ? "" : "s"} short`,
        { reason: "TOO_EARLY_TO_CHECK_OUT", minutesRemaining: remaining },
      );
    }

    return prisma.staffAttendance.update({
      where: { staffUserId_date: { staffUserId: actor.id, date } },
      data: { logoutAt },
    });
  },

  async getToday(actor: Actor) {
    const date = istStartOfDay(new Date());
    return prisma.staffAttendance.findUnique({ where: { staffUserId_date: { staffUserId: actor.id, date } } });
  },

  /** Own history — lets a branch admin see (and spot gaps in) their own recent record, defaulting to the current month. */
  async listMine(params: { from?: Date; to?: Date }, actor: Actor) {
    const to = params.to ?? new Date();
    const from = params.from ?? istFirstOfMonth(to);
    return prisma.staffAttendance.findMany({
      where: { staffUserId: actor.id, date: { gte: istStartOfDay(from), lte: istEndOfDay(to) } },
      orderBy: { date: "desc" },
    });
  },

  /**
   * Super Admin oversight: every active branch's check-in status for one
   * date (defaults to today) — the direct, actionable view behind a
   * "branch missed attendance" notification (see notifications.service.ts).
   */
  async overview(params: { date?: Date }, actor: Actor) {
    if (actor.role !== "SUPER_ADMIN") throw new ForbiddenError("Only Super Admin can view this");
    const date = istStartOfDay(params.date ?? new Date());

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        users: {
          where: { role: "BRANCH_ADMIN", status: { not: "DISABLED" } },
          select: { id: true, name: true, email: true, username: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const records = await prisma.staffAttendance.findMany({
      where: { date, staffUserId: { in: branches.flatMap((b) => b.users.map((u) => u.id)) } },
    });
    const recordByStaffId = new Map(records.map((r) => [r.staffUserId, r]));

    return branches.map((b) => ({
      branchId: b.id,
      branchName: b.name,
      date,
      admins: b.users.map((u) => {
        const record = recordByStaffId.get(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          loginAt: record?.loginAt ?? null,
          logoutAt: record?.logoutAt ?? null,
          status: record?.status ?? null,
        };
      }),
      marked: b.users.some((u) => recordByStaffId.get(u.id)?.loginAt),
    }));
  },

  /**
   * Super Admin's "how reliable is this branch office" drill-down (Users &
   * Roles → click a branch office row) — real present/absent day counts
   * for one staff login over a date range, defaulting to the current
   * month. "Absent" here means "a calendar day in range with no check-in
   * on record", the same definition ensureBranchMissedEscalations uses —
   * there's no separate flow that ever writes an explicit ABSENT/HALF_DAY/
   * LEAVE row today (see schema.prisma StaffAttendanceStatus), so it has
   * to be derived from missing rows rather than read off a status column.
   */
  async summaryForUser(staffUserId: string, params: { from?: Date; to?: Date }, actor: Actor) {
    if (actor.role !== "SUPER_ADMIN") throw new ForbiddenError("Only Super Admin can view this");

    const staff = await prisma.user.findUnique({
      where: { id: staffUserId },
      select: { id: true, role: true, name: true, email: true, username: true, branch: { select: { id: true, name: true } }, createdAt: true },
    });
    if (!staff) throw new NotFoundError("User not found");
    if (staff.role !== "BRANCH_ADMIN") throw new ValidationError("Attendance is only tracked for branch office logins");

    const today = istStartOfDay(new Date());
    const requestedTo = istStartOfDay(params.to ?? today);
    const to = requestedTo > today ? today : requestedTo; // never count a future day as absent
    const requestedFrom = istStartOfDay(params.from ?? istFirstOfMonth(to));
    const accountStart = istStartOfDay(staff.createdAt);
    const from = requestedFrom > accountStart ? requestedFrom : accountStart; // never look back before the login existed

    const records = await prisma.staffAttendance.findMany({
      where: { staffUserId, date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
    });
    const recordByDateKey = new Map(records.map((r) => [istDateKey(r.date), r]));

    let daysPresent = 0;
    let daysAbsent = 0;
    if (from <= to) {
      for (let cursor = from; cursor <= to; cursor = istNextDay(cursor)) {
        if (recordByDateKey.get(istDateKey(cursor))?.loginAt) daysPresent += 1;
        else daysAbsent += 1;
      }
    }

    return {
      staff: { id: staff.id, name: staff.name, email: staff.email, username: staff.username, branch: staff.branch },
      period: { from, to },
      daysPresent,
      daysAbsent,
      totalDays: daysPresent + daysAbsent,
      records: records.map((r) => ({ date: r.date, loginAt: r.loginAt, logoutAt: r.logoutAt, status: r.status })),
    };
  },
};

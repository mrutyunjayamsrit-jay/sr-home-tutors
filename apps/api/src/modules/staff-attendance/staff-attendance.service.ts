import { prisma } from "@/common/prisma";
import { ForbiddenError, ValidationError } from "@/common/errors/AppError";
import { MIN_CHECKOUT_GAP_MINUTES } from "@/common/constants/attendance";
import type { CheckTimeInput } from "./staff-attendance.types";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function combineDateAndTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(h ?? 0, m ?? 0, 0, 0);
  return combined;
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
    const date = startOfDay(input.date ?? new Date());
    const loginAt = combineDateAndTime(date, input.time);

    return prisma.staffAttendance.upsert({
      where: { staffUserId_date: { staffUserId: actor.id, date } },
      update: { loginAt, status: "PRESENT" },
      create: { branchId: actor.branchId, staffUserId: actor.id, date, loginAt, status: "PRESENT" },
    });
  },

  async checkOut(input: CheckTimeInput, actor: Actor) {
    if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
    const date = startOfDay(input.date ?? new Date());
    const logoutAt = combineDateAndTime(date, input.time);

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
    const date = startOfDay(new Date());
    return prisma.staffAttendance.findUnique({ where: { staffUserId_date: { staffUserId: actor.id, date } } });
  },

  /** Own history — lets a branch admin see (and spot gaps in) their own recent record, defaulting to the current month. */
  async listMine(params: { from?: Date; to?: Date }, actor: Actor) {
    const to = params.to ?? new Date();
    const from = params.from ?? new Date(to.getFullYear(), to.getMonth(), 1);
    return prisma.staffAttendance.findMany({
      where: { staffUserId: actor.id, date: { gte: startOfDay(from), lte: endOfDay(to) } },
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
    const date = startOfDay(params.date ?? new Date());

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
};

import { prisma } from "@/common/prisma";
import { logger } from "@/common/logger";
import { istStartOfDay, istNextDay } from "@/common/utils/istDate";

/**
 * Closes out yesterday-and-earlier attendance that nobody ever touched —
 * writes a real ABSENT_TUTOR status / StaffAttendance row instead of
 * leaving it to be inferred live on every report read. Lazily triggered
 * (called from the read paths that show attendance — reports, Class
 * Attendance, staff-attendance overview/history), same convention as
 * notifications.service.ts's ensureShortClassEscalations/
 * ensureBranchMissedEscalations: no cron/scheduler needed, both operations
 * are cheap and fully idempotent (safe to call on every request).
 */

/**
 * Any ClassSession still sitting at SCHEDULED whose date has passed, with
 * no tutorCheckIn, is never going to retroactively become COMPLETED — the
 * tutor didn't show up. Closed out as ABSENT_TUTOR so every report reads
 * it directly off the row instead of re-deriving it each time.
 */
export async function closeStaleClassSessions() {
  const cutoff = istStartOfDay(new Date());
  const result = await prisma.classSession.updateMany({
    where: { status: "SCHEDULED", scheduledDate: { lt: cutoff }, tutorCheckIn: null },
    data: { status: "ABSENT_TUTOR", markMethod: "SYSTEM_AUTO" },
  });
  if (result.count > 0) logger.info({ count: result.count }, "Auto-marked stale class sessions as ABSENT_TUTOR");
  return result.count;
}

/**
 * A Branch Admin who never checked in on a given past day has no
 * StaffAttendance row at all for that day (see staff-attendance.service.ts —
 * a row is only ever created by checkIn). Backfills one ABSENT row per
 * missing (staff, day) pair, from that admin's own account creation date up
 * to yesterday — `skipDuplicates` makes this safe to re-run over the same
 * history repeatedly without touching any day that already has a real
 * PRESENT/HALF_DAY/LEAVE row.
 */
export async function closeStaleStaffAttendance() {
  const yesterday = new Date(istStartOfDay(new Date()).getTime() - 24 * 60 * 60 * 1000);

  const admins = await prisma.user.findMany({
    where: { role: "BRANCH_ADMIN", status: { not: "DISABLED" }, branchId: { not: null } },
    select: { id: true, branchId: true, createdAt: true },
  });

  const rows: { branchId: string; staffUserId: string; date: Date; status: "ABSENT" }[] = [];
  for (const admin of admins) {
    if (!admin.branchId) continue;
    let cursor = istStartOfDay(admin.createdAt);
    while (cursor <= yesterday) {
      rows.push({ branchId: admin.branchId, staffUserId: admin.id, date: cursor, status: "ABSENT" });
      cursor = istNextDay(cursor);
    }
  }
  if (rows.length === 0) return 0;

  const result = await prisma.staffAttendance.createMany({ data: rows, skipDuplicates: true });
  if (result.count > 0) logger.info({ count: result.count }, "Backfilled missing StaffAttendance days as ABSENT");
  return result.count;
}

let lastRunAt = 0;
const MIN_INTERVAL_MS = 5 * 60_000; // never re-scan more than once per 5 minutes, regardless of request volume

/** Call from any read path that shows attendance — debounced so a burst of page loads doesn't re-scan on every single request. */
export async function ensureAttendanceClosed() {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;
  lastRunAt = now;
  await Promise.all([closeStaleClassSessions(), closeStaleStaffAttendance()]);
}

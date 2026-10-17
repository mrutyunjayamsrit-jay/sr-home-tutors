import type { Prisma } from "@prisma/client";
import { istStartOfDay, istDayOfWeek, istNextDay, istCombineDateAndTime, istDateParts } from "@/common/utils/istDate";

/**
 * Expands an Assignment's weekly recurrence (daysOfWeek + time slot) into
 * concrete ClassSession rows — the attendance atom everything else (reports,
 * payroll) rolls up from. Generates from `from` through `to` inclusive.
 *
 * All day/time math here is IST-explicit (see common/utils/istDate.ts) —
 * `daysOfWeek` and `timeSlotStart`/`timeSlotEnd` are set by Indian branch
 * offices meaning IST days/times, and this is server-side code that must
 * not depend on the server process's own OS timezone. A prior version
 * used `date.setHours(...)` and local `Date` getters here, which produced
 * every generated class's scheduled time 5.5 hours wrong the moment this
 * ran on a server not set to IST (e.g. a cloud VM, which defaults to
 * UTC) — see context/08-KNOWN-GAPS-AND-TODOS.md.
 *
 * Rolling-horizon by design, not "forever": we generate through the end of
 * next calendar month at creation time and would need a scheduled job to
 * extend it monthly in production (documented gap — see docs/DECISIONS.md).
 * Re-running for a date range that already has sessions is safe to call
 * (caller is expected to de-dupe by checking existing dates first).
 */
export function generateSessionDates(daysOfWeek: number[], from: Date, to: Date): Date[] {
  const days = new Set(daysOfWeek);
  const dates: Date[] = [];
  let cursor = istStartOfDay(from);
  const end = istStartOfDay(to);
  while (cursor <= end) {
    if (days.has(istDayOfWeek(cursor))) {
      dates.push(cursor);
    }
    cursor = istNextDay(cursor);
  }
  return dates;
}

export function buildSessionRows(
  assignment: {
    id: string;
    daysOfWeek: number[];
    timeSlotStart: string;
    timeSlotEnd: string;
    startDate: Date;
  },
  horizonEnd: Date,
): Prisma.ClassSessionCreateManyInput[] {
  const from = assignment.startDate > new Date() ? assignment.startDate : new Date();
  const dates = generateSessionDates(assignment.daysOfWeek, from, horizonEnd);
  return dates.map((date) => ({
    assignmentId: assignment.id,
    scheduledDate: date,
    scheduledStart: istCombineDateAndTime(date, assignment.timeSlotStart),
    scheduledEnd: istCombineDateAndTime(date, assignment.timeSlotEnd),
    status: "SCHEDULED" as const,
  }));
}

/** Rolling horizon used at assignment-creation time: through the end of next calendar month, in IST. */
export function defaultHorizonEnd(): Date {
  const { year, month } = istDateParts(new Date());
  // Day 0 of (month+2) = last day of (month+1) — same "day 0" trick as
  // before, just resolved against the IST year/month rather than the
  // server's own local fields.
  return istStartOfDay(new Date(Date.UTC(year, month + 2, 0)));
}

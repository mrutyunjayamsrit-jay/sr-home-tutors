import type { Prisma } from "@prisma/client";

/**
 * Expands an Assignment's weekly recurrence (daysOfWeek + time slot) into
 * concrete ClassSession rows — the attendance atom everything else (reports,
 * payroll) rolls up from. Generates from `from` through `to` inclusive.
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
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    if (days.has(cursor.getDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function combineDateAndTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(h ?? 0, m ?? 0, 0, 0);
  return combined;
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
    scheduledStart: combineDateAndTime(date, assignment.timeSlotStart),
    scheduledEnd: combineDateAndTime(date, assignment.timeSlotEnd),
    status: "SCHEDULED" as const,
  }));
}

/** Rolling horizon used at assignment-creation time: through the end of next calendar month. */
export function defaultHorizonEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 2, 0); // day 0 of month+2 = last day of month+1
}

/**
 * This app serves India-only customers — "today"/"this date"/"this month"
 * for attendance, scheduling, and notification purposes always means the
 * IST calendar, regardless of what timezone the server process itself
 * happens to be running in. Plain JS `Date` local getters/setters
 * (`getFullYear`, `setHours`, `getDay`, `toLocaleDateString` without an
 * explicit `timeZone`, etc.) depend on the SERVER's OS timezone, not any
 * fixed zone — correct by coincidence on a dev machine set to IST,
 * silently wrong (by exactly 5.5 hours, or by a day near midnight IST) on
 * a server running in UTC (e.g. a fresh cloud VM, which defaults to UTC).
 * This was a real bug hit in production (check-in times, and — more
 * seriously — every newly-generated class's scheduled time, off by 5.5
 * hours) after deploying to an Oracle Cloud VM — see
 * context/08-KNOWN-GAPS-AND-TODOS.md.
 *
 * Use these wherever server-side code needs to reason about "which IST
 * day/month" an instant falls on, or needs to build an instant from an
 * IST wall-clock time — never local `Date` getters/setters for that.
 * India has no DST, so a flat 24h step is always exactly one IST calendar
 * day — no need to ever re-derive it from local fields mid-calculation.
 */
const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The IST calendar date (year, 0-indexed month, day) containing `instant`. */
export function istDateParts(instant: Date): { year: number; month: number; day: number } {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

/** Midnight IST (00:00:00 IST) on the calendar day containing `instant`, as a real absolute instant. */
export function istStartOfDay(instant: Date): Date {
  const { year, month, day } = istDateParts(instant);
  return new Date(Date.UTC(year, month, day) - IST_OFFSET_MS);
}

/** 23:59:59.999 IST on the calendar day containing `instant`. */
export function istEndOfDay(instant: Date): Date {
  return new Date(istStartOfDay(instant).getTime() + DAY_MS - 1);
}

/** Midnight IST on the 1st of the IST calendar month containing `instant`. */
export function istFirstOfMonth(instant: Date): Date {
  const { year, month } = istDateParts(instant);
  return new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
}

/** The IST day-of-week (0=Sun..6=Sat, same convention as JS `Date.getDay`) for the calendar day containing `instant`. */
export function istDayOfWeek(instant: Date): number {
  const { year, month, day } = istDateParts(instant);
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

/** "YYYY-MM-DD" for the IST calendar day containing `instant` — for dedupe keys/labels, never `instant.toISOString().slice(0, 10)` (that's the UTC day, not the IST one). */
export function istDateKey(instant: Date): string {
  const { year, month, day } = istDateParts(instant);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** One IST calendar day after `instant`'s IST day, at IST midnight — safe to use for day-by-day iteration (no DST in India, so this is always exactly +24h). */
export function istNextDay(instant: Date): Date {
  return new Date(istStartOfDay(instant).getTime() + DAY_MS);
}

/**
 * Combines the IST calendar day containing `date` with an `"HH:mm"` string
 * meant as an IST wall-clock time, into the correct absolute instant.
 * Replaces the `date.setHours(h, m, 0, 0)` pattern, which silently uses
 * the server's own timezone instead of IST.
 */
export function istCombineDateAndTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const midnightIst = istStartOfDay(date);
  return new Date(midnightIst.getTime() + ((h ?? 0) * 60 + (m ?? 0)) * 60_000);
}

/** Formats an instant as an IST calendar date (e.g. "17 Oct 2026") regardless of server timezone — for notification bodies/labels. */
export function formatIstDate(instant: Date): string {
  return instant.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

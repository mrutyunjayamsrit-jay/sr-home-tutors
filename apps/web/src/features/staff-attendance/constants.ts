// Mirrors the backend's MIN_CHECKOUT_GAP_MINUTES (see
// common/constants/attendance.ts) — display/pre-flight-check only here,
// the backend (staff-attendance.service.ts checkOut) is the authority.
export const MIN_CHECKOUT_GAP_MINUTES = 50;

/** Combines a "HH:mm" string with today's date, using the browser's own local time — this becomes the real instant sent to the server (see api.ts's CheckTimeInput), never a bare string the server would have to reconstruct itself. */
export function combineTodayTime(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

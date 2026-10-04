// Shared by reports.service.ts (highlighting) and notifications.service.ts
// (escalating to Super Admin) — kept in one place so the two never drift.

/** A typical home-tuition class runs 1 hour 20 minutes. */
export const USUAL_CLASS_DURATION_MINUTES = 80;

/** A COMPLETED class whose real check-in→check-out difference falls under this is flagged as unusually short. */
export const SHORT_CLASS_THRESHOLD_MINUTES = 40;

/** More than this many short classes in a calendar month escalates that tutor to Super Admin. */
export const SHORT_CLASS_ESCALATION_COUNT = 3;

/**
 * Minimum real gap required between a check-in and its matching check-out —
 * applies everywhere the two are paired: a tutor's own class check-in/out
 * (attendance.service.ts), the office's manual entry for a class
 * (attendance.service.ts mark()), and a Branch Admin's own daily office
 * attendance (staff-attendance.service.ts). Deliberately NOT tied to class
 * duration/scheduling — it's a floor on the recorded gap being real, not a
 * class-hours window (see attendance.service.ts's removal of that).
 */
export const MIN_CHECKOUT_GAP_MINUTES = 50;

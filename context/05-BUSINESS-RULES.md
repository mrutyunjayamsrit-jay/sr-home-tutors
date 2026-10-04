# Business Rules & Magic Numbers

Every number here lives in exactly one shared constants file and is
referenced from wherever it's enforced — never hardcoded redundantly. If a
new customer needs a different value, change it in the one place listed and
every dependent feature picks it up automatically.

## Attendance

All in `apps/api/src/common/constants/attendance.ts` (mirrored, read-only,
in `apps/web/src/features/attendance/constants.ts` / `.../staff-attendance/
constants.ts` for client-side button-state purposes — **the backend copy is
always the real authority; the frontend copy only pre-empts a submission
that would be rejected anyway**):

- **`MIN_CHECKOUT_GAP_MINUTES = 50`** — the minimum real elapsed time
  required between a check-in and its matching check-out, enforced
  identically across three separate flows: a tutor's own class check-in/
  out, the office's manual class-attendance entry, and a Branch Admin's own
  daily office check-in/out. Deliberately **not** tied to the scheduled
  class duration — it's a floor on "did real time actually pass," not a
  class-hours window.
- **`SHORT_CLASS_THRESHOLD_MINUTES = 40`** — a COMPLETED class whose real
  check-in→check-out difference falls under this is flagged (⚠ in Reports)
  as unusually short.
- **`SHORT_CLASS_ESCALATION_COUNT = 3`** — a tutor who racks up more than
  this many short classes in one calendar month gets an automatic
  Super-Admin notification (`notifications.service.ts`'s
  `ensureShortClassEscalations`), recomputed live on every notifications
  poll, not a one-shot alert.
- **`USUAL_CLASS_DURATION_MINUTES = 80`** — reference value (1h20m), used
  for framing/context, not itself an enforced gate.
- **`ATTENDANCE_GEOFENCE_RADIUS_METERS`** (`env.ts`, default **200**) — how
  close (meters) a tutor's GPS must be to the parent's home to be allowed
  to check in/out by location. Configurable per deployment via env var,
  *not* hardcoded — a new customer in a denser or sparser area might want
  this different.
- **Branch attendance-missed escalation**: if no Branch Admin at a branch
  checked in on a given day, every Super Admin gets one notification per
  (branch, day) — looks back up to 7 days so a Super Admin who doesn't
  check notifications daily still catches up on everything missed, and the
  notification is automatically cleared if the branch backfills that day
  later.

## Referrals

- A **tutor** can refer another **tutor** (Tutor Enquiry pipeline) *or*
  another **student/family** (Parent Enquiry pipeline). A **parent** can
  refer another **parent/family** (Parent Enquiry pipeline only — no
  parent-refers-tutor path).
- A referrer only ever sees/edits referrals **they personally submitted**
  (`createdById` check layered on top of the branch check) — never the rest
  of the branch's pipeline.
- A referrer can **never** self-approve: status changes and "convert to
  registered" always stay office-only (`SUPER_ADMIN`/`BRANCH_ADMIN`), even
  though the create/read/update-own-draft paths are opened up to
  TUTOR/PARENT.
- Referral-bonus visibility: Super Admin (or Branch Admin, for their own
  branch) flags an Announcement with `category: "REFERRAL_BONUS"`; every
  Refer page (tutor→tutor, tutor→student, parent→parent) fetches and
  banners any currently-live announcement with that category, scoped by
  the normal Announcement audience/branch rules — this is how "there's a
  bonus right now" gets surfaced right where the decision to refer is
  made, not buried in the generic Announcements list.

## Fees

- **Rate-card matching** (`lib/rateCardMatch.ts`, client-side): given a
  chosen board + a chosen class, find the Fee Rate Card whose
  `classCategory` (free text, e.g. `"1-5"`, `"6-10"`, `"11-12"`,
  `"College"`) matches. For a numeric class, parses `classCategory` as a
  `"low-high"` range (or a single exact number) and checks containment;
  for a non-numeric class (a degree/course name), matches the first
  category that *isn't* itself a numeric range. **Best-effort only** —
  returns nothing rather than guessing when it can't match, and never
  overwrites a value the office has already typed by hand
  (`formState.dirtyFields` guard).
- **Tutor payable** = classes actually taken (COMPLETED sessions) in the
  reporting period × `Assignment.perClassRate`. `perClassRate` is captured
  once at assignment time (either set directly, or derived as `fixedSalary
  ÷ fixedClassesPerMonth`) and never recalculated retroactively if the
  salary is edited later — historical payroll never silently drifts.
- **Student fees**: `StudentFeeInvoice` is a real committed record per
  (student, period) — raised explicitly by the office, paid down via
  recorded payments (optionally with a proof-of-payment file), never a
  live calculation the way payroll display is.
- **Reporting period** for tutor payouts is **not a calendar month** — it's
  literally the `from`/`to` date range the report was run with
  (`periodKey(from, to)`), so re-running a report with the same range
  always reconciles against the same payout row, and a different range is
  treated as a genuinely different period.

## Notifications (idempotency)

Every system-generated notification has a `dedupeKey` and is created via
`upsert`, never plain `create` — the recurring key shapes: `attendance-
reminder:{userId}:{date}`, `branch-attendance-missed:{branchId}:{date}:
{superAdminId}`, `short-classes:{tutorId}:{month}:{superAdminId}`, `task-
assigned:{taskId}:{userId}`, `task-completed:{taskId}:{superAdminId}`,
`parent-query-asked:{queryId}:{recipientId}`, `parent-query-answered:
{queryId}`. Follow this shape (`{eventType}:{subjectId}:...:{recipientId}`)
for any new notification type.

## Access boundaries worth remembering exactly

- Only **Super Admin** sees cross-branch aggregate data anywhere in the
  app (Reports, Users, rate cards, etc.) — Branch Admin is always forced
  onto their own branch, server-side, regardless of what a client sends.
- Only **Super Admin** can change a branch's name/email/phone; a Branch
  Admin can only edit their own branch's *address*.
- Only **Super Admin** sets Fee Rate Cards; Branch Admin can read (needed
  to raise an invoice) but never write.
- A parent question addressed to `SUPER_ADMIN` is invisible to every
  Branch Admin, including the parent's own branch's — that's the entire
  point of the two-target design.
- `TUTOR` is excluded entirely from every fee/billing-related report
  endpoint (Student Fees, Parent Enquiry Fees, the new detail dialogs) —
  billing is between the institute and the parent, a tutor has no
  legitimate reason to see it, enforced at the controller level even
  though the router otherwise allows TUTOR on that path.

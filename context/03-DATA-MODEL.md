# Data Model

Full reference: `apps/api/prisma/schema.prisma` (805 lines, PostgreSQL). This
file explains the *shape* and the handful of non-obvious design choices; for
field-by-field detail just read the schema, it's heavily commented.

## Enums (21)

`Role` (SUPER_ADMIN/BRANCH_ADMIN/TUTOR/PARENT/STUDENT) · `UserStatus`
(PENDING_ACTIVATION/ACTIVE/DISABLED) · `Gender` · `EnquiryStatus`
(NEW/IN_REVIEW/ACCEPTED/REJECTED) · `ProfileStatus`
(REGISTERED/ASSIGNED/ACTIVE/INACTIVE — the lifecycle for Tutor/Parent/
Student, an addition beyond the original spec) · `TeachCategory`
(PRIMARY/HIGHSCHOOL/COLLEGE/DEGREE) · `Board` (STATE/CBSE/ICSE/OTHER) ·
`AddressProofType` (AADHAR/VOTER_ID/DRIVING_LICENSE/PASSPORT/OTHER — the one
India-specific enum) · `AssignmentStatus` (ACTIVE/PAUSED/ENDED) ·
`SessionStatus` (SCHEDULED/COMPLETED/ABSENT_STUDENT/ABSENT_TUTOR/CANCELLED)
· `AttendanceMarkMethod` (MANUAL/CLASS_CODE\*/LOCATION/MANUAL_AREA — \*retired,
kept only so old rows still deserialize) · `BillingCycle`
(MONTHLY/PACKAGE) · `InvoiceStatus` (PENDING/PARTIAL/PAID/OVERDUE) ·
`PayoutStatus` (PENDING/FINALIZED/PAID) · `AdjustmentType`
(BONUS/DEDUCTION) · `StaffAttendanceStatus`
(PRESENT/ABSENT/HALF_DAY/LEAVE) · `DocumentOwnerType` (see Document below) ·
`AnnouncementAudience` (ALL/TUTORS/PARENTS/STUDENTS/BRANCH_STAFF) ·
`TaskStatus` (PENDING/COMPLETED) · `QueryTarget` (BRANCH/SUPER_ADMIN) ·
`QueryStatus` (OPEN/ANSWERED).

## Identity & access

- **`Branch`** — the tenant boundary. Everything else either has a
  `branchId` directly or reaches one through a relation.
- **`User`** — the login row for every role. `branchId` is null only for
  SUPER_ADMIN. `name` is only meaningfully populated for
  SUPER_ADMIN/BRANCH_ADMIN logins — Tutor/Parent/Student keep their real
  name on their own richer profile table (see below) and reach it via
  `userId`. Auth fields: `passwordHash` (bcrypt, nullable — a Google-only
  account never sets one), `googleSub` (unique, links to Google OIDC),
  `mustResetPassword` (forces a reset on first login for admin-issued
  accounts), `failedLoginCount`/`lockedUntil` (brute-force lockout).
- **`RefreshToken`** — one row per issued refresh token (hashed, not the
  raw token), so a token can be individually revoked; cascades on user
  delete.
- **`RuleAcknowledgment`** — one timestamped row per tutor login, recording
  that they re-accepted the institute rules text (from `OrgSettings.
  tutorRulesText`) that login — an audit trail, not just a UI checkbox.

## CRM funnel: enquiries

- **`TutorEnquiry`** / **`ParentEnquiry`** — a lead, before conversion.
  `createdById` is whoever raised it — office staff, a referring tutor, a
  referring parent, or the literal string sentinel used by the public
  unauthenticated "Request a Tutor" form (see `enquiries` module). Converts
  1:1 into a `Tutor`/`Parent` row (the `tutor`/`parent` back-relation is
  optional — null until converted). `ParentEnquiry.feesPrescribed` vs.
  `agreedFinalFees` is a deliberate pair: the first auto-prefills from a
  matching `FeeRateCard` when the office raises the enquiry, the second is
  what was actually negotiated — Super Admin sees both side by side in
  Reports to track the gap.
- Subjects/areas on an enquiry are **plain `String[]`, not foreign keys**
  into `Subject`/`Area` — a value picked from the master list at form-fill
  time keeps working forever even if that master-list row is later renamed
  or deleted. This same "picked-from-a-list-but-stored-as-a-free-string"
  pattern repeats on `Tutor.subjects`/`.areas`, `Student.subjectsNeeded`,
  `Parent.area`.

## Master data

- **`Subject`** — global (not branch-scoped), Super-Admin-maintained.
  Lazily seeded with six defaults (see `02-ARCHITECTURE...md` §5) the first
  time it's read empty.
- **`Area`** — scoped to one branch (`@@unique([branchId, name])`) —
  neighborhoods/localities within that branch's service area, used for
  tutor-matching.

## Registered profiles

- **`Tutor`** / **`Parent`** / **`Student`** — the real, post-conversion
  records. `Tutor.userId`/`Parent.userId`/`Student.userId` are all optional
  1:1 to `User` (a Student is usually, but not strictly required to be,
  given a login). `enquiryId` traces back to the enquiry that became this
  row. All three carry a `ProfileStatus` lifecycle. `Parent.latitude`/
  `.longitude` is the home location used for tutor geofencing — set
  best-effort at public-form registration, refreshable by the parent
  themself later (the more trustworthy source, since it's captured on
  their own device at their own home).

## Matching & delivery

- **`Assignment`** — one tutor↔one student, the thing that actually
  generates classes. Carries the negotiated `perClassRate`,
  `fixedClassesPerMonth`, weekly recurrence (`daysOfWeek` as `0=Sun..6=Sat`,
  `timeSlotStart`/`timeSlotEnd` as 24h `"HH:mm"` strings), and
  `classDurationMinutes`. `fixedSalary` is an alternate input path — rate
  can be set directly or derived as `fixedSalary ÷ fixedClassesPerMonth`,
  but either way `perClassRate` is what's actually stored and used, so
  changing `fixedSalary` later never silently changes historical payroll.
- **`ClassSession`** — one row per *scheduled occurrence* of an Assignment,
  generated ahead for a rolling horizon (`session-generator.ts`). This is
  the single source of truth every attendance/payment/report figure is
  computed from — never a separately maintained counter. Carries the full
  audit trail of *how* it was marked: `markMethod` (MANUAL /
  LOCATION / MANUAL_AREA), the tutor's GPS + computed distance from the
  parent's home when location-verified, or the typed area text when GPS
  wasn't available.
- **`TestResult`** / **`TutorStudentReview`** — per-assignment marks and
  tutor-written reviews (strengths/weaknesses/overall).

## Money

- **`FeeRateCard`** — Super-Admin-set `ratePerClass` per branch × board ×
  `classCategory` (a **free-text** bucket like `"1-5"`/`"6-10"`/`"11-12"`/
  `"College"`, not an enum — the web app parses this as a numeric range at
  match time; see `lib/rateCardMatch.ts`). Used to auto-prefill
  `ParentEnquiry.feesPrescribed`.
- **`StudentFeeInvoice`** — one per student per billing period
  (`@@unique([studentId, period])`), a real committed billing record (not
  a live calculation) — `payableFees`/`paidAmount`/`balance` are written
  once and read back as history.
- **`TutorPayout`** — the payroll mirror of the above, one per tutor per
  reporting period (`@@unique([tutorId, period])`), plus optional
  **`PayoutAdjustment`** line items (bonus/deduction with a required
  `reason`).
- **`StaffAttendance`** — the *office staff's own* daily check-in/out
  (Branch Admin's personal presence), **completely separate** from
  `ClassSession` (tutor-per-class attendance) — these look similar and
  have confused people before; see `02-...md` and `08-KNOWN-GAPS.md`'s
  history note on the "Attendance" vs. "My Attendance" nav confusion.
- **`Expense`** — simple branch-level expense ledger, category + amount +
  date.

## Content & comms

- **`Document`** — **polymorphic by convention**, not a real DB relation:
  `ownerType` (`DocumentOwnerType` enum) + `ownerId` (a plain string, no
  FK) together identify what it's attached to (a TutorEnquiry, a
  ParentEnquiry, a Tutor's KYC doc, a Parent's, a Student's, an Expense
  receipt, a study Material, or a StudentFeeInvoice payment proof).
  Postgres can't FK one column against five different target tables, so
  referential integrity here is enforced in `documents.service.ts` (verify
  the owner exists before insert) rather than by the database. **Storage
  is currently local disk only** — see `08-KNOWN-GAPS.md`, this is the
  single biggest thing to fix before real production use.
- **`Announcement`** — `branchId: null` means institute-wide (Super Admin
  only can publish those); otherwise scoped to one branch (Branch Admin or
  Super Admin can publish). `audience` filters who sees it beyond branch
  scope. `category` is a free string, currently only ever set to
  `"REFERRAL_BONUS"` to make a referral-bonus announcement surface as a
  banner directly on the Refer pages, not just the generic Announcements
  list — the same pattern (a nullable `category` string) is a reasonable
  template if a future customer needs another announcement sub-type.
- **`Task`** — Super Admin → one branch, unlike Announcement it's
  actionable (`PENDING`/`COMPLETED`, with `completedById`/`completedAt`).
- **`ParentQuery`** — a parent's question, addressed to `BRANCH` or
  `SUPER_ADMIN` (`target` determines who's notified and who may answer —
  see `02-...md`'s access-control pattern list). One answer, no threading.
- **`Notification`** — generic in-app notification row for any role.
  `dedupeKey` (unique, nullable) is what makes system-generated
  notifications safe to `upsert` repeatedly without duplicating — see
  `02-...md` §5.

## Governance

- **`AuditLog`** — generic before/after JSON diff log, used today mainly by
  Settings updates (`SETTINGS_UPDATED`) — a reasonable pattern to extend to
  other sensitive mutations (rate card changes, user role changes) if a
  future customer needs a fuller audit trail.
- **`OrgSettings`** — a genuine **singleton table**: `id` is always the
  literal string `"singleton"`, enforced by application code always
  reading/writing that one id (Postgres has no native "at most one row"
  constraint short of a trigger, so this is a convention, not a DB
  guarantee — don't add a second row by hand). Holds the org name, support
  contact, and the tutor rules-acknowledgment text — the one piece of
  branding that's already runtime-editable by Super Admin without a
  redeploy. See `06-REBRANDING-CHECKLIST.md` for what still *isn't* wired
  to read from here despite the field existing.

# Data Model

Source of truth is [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).
This document explains the *why* behind the shape.

## Entity groups

### Identity & access
- **Branch** — a franchise/office location. Root of almost all scoping.
- **User** — the single authentication identity (role, credentials, Google
  subject, status). One row per human, regardless of role.
- **RefreshToken** — hashed, rotatable, revocable refresh tokens (never store
  raw tokens).
- **RuleAcknowledgment** — a timestamped record every time a tutor
  acknowledges institute rules at login (PDF-specified compliance gate,
  must be auditable, not just a client-side checkbox).

### CRM funnel (pre-registration)
- **TutorEnquiry** / **ParentEnquiry** — the lead-capture stage. Carry the
  raw enquiry data (contact info, interests/requirements, address proof
  document reference, status). Converting one creates the corresponding
  registered profile + `User` login.

### Registered profiles
- **Tutor** — registered tutor profile, optionally linked to a `TutorEnquiry`
  it was converted from, and to exactly one `User` (login).
- **Parent** — registered parent profile, same pattern.
- **Student** — belongs to a `Parent` (a parent can have many students —
  supports multiple children under one parent account with a switcher UI).
  Optionally linked to its own `User` for the read-only student login.

### Matching & delivery
- **Assignment** — the tutor↔student pairing for a subject/set of subjects:
  schedule (days/time/duration), `perClassRate` (drives payroll — stored
  explicitly so later salary edits don't retroactively change past payouts),
  fixed classes/month, status.
- **ClassSession** — one concrete occurrence of an Assignment: scheduled
  date/time, actual tutor check-in/check-out, status
  (`SCHEDULED/COMPLETED/ABSENT_STUDENT/ABSENT_TUTOR/CANCELLED`), chapters/
  topics covered. This is the attendance atom — everything in the
  attendance and payroll reports rolls up from `ClassSession` rows, never
  from a manually-entered summary number, so the numbers can't drift out of
  sync with reality.
- **TestResult** — subject/topic/marks per student, tied to an Assignment.
- **TutorStudentReview** — the tutor's strengths/weaknesses/overall-review of
  a student (PDF calls this "opinion of tutors" in the parent view and
  "opinion of students" in the tutor view — same underlying record, written
  by the tutor, read by parent/student/branch admin).

### Money
- **FeeRateCard** — branch-scoped rate per board (State/CBSE/ICSE) × class
  category; the source for "per class pay for each class" the PDF asks for.
  Editable by branch admin; versioned by `effectiveFrom` rather than
  overwritten in place, so historical invoices remain explainable.
- **StudentFeeInvoice** — one per student per billing period; computed from
  fixed classes/fees vs. classes actually taken (from `ClassSession`),
  producing `payableFees`/`balance`.
- **TutorPayout** — one per tutor per billing period; `payableAmount =
  perClassRate × classesTaken` (confirmed formula) plus optional
  **PayoutAdjustment** line items (bonus/deduction, e.g. travel
  reimbursement, late-cancellation penalty).
- **StaffAttendance** — branch office-staff (non-tutor) attendance/payroll,
  per the PDF's separate "staff attendance report."
- **Expense** — branch operating expenses ("Accounts/Expenses management").

### Content & comms
- **Document** — polymorphic file metadata (KYC proofs, study materials,
  receipts) pointing at a storage key, never storing the file itself in
  Postgres.
- **Announcement** — branch or global, targeted by audience.
- **Notification** — per-user, in-app (+ email later).

### Governance
- **AuditLog** — before/after snapshots for sensitive mutations (fee edits,
  assignment changes, payout finalization, user status changes).

## Relationships (summary)

```
Branch 1─* User
Branch 1─* TutorEnquiry / ParentEnquiry
TutorEnquiry 0..1─1 Tutor 1─0..1 User
ParentEnquiry 0..1─1 Parent 1─0..1 User
Parent 1─* Student *─0..1 User
Tutor 1─* Assignment *─1 Student
Assignment 1─* ClassSession
Assignment 1─* TestResult, TutorStudentReview
Branch 1─* FeeRateCard
Student 1─* StudentFeeInvoice
Tutor 1─* TutorPayout 1─* PayoutAdjustment
Branch 1─* StaffAttendance, Expense, Announcement
User 1─* Notification, RefreshToken, AuditLog(as actor)
* ─* Document (polymorphic ownerType/ownerId)
```

## Key indexes & constraints

- `User.email`, `User.username`, `User.googleSub` — unique (nullable, so
  partial-unique in Postgres via Prisma's `@unique` on nullable column).
- `Branch.code` — unique.
- `Tutor.userId`, `Parent.userId`, `Student.userId` — unique (one login per
  profile).
- `Assignment(tutorId)`, `Assignment(studentId)`, `Assignment(branchId)` —
  indexed for common lookup paths ("my students," "my tutors").
- `ClassSession(assignmentId, scheduledDate)` — indexed for date-range
  attendance reports.
- `StudentFeeInvoice(studentId, period)` — unique (one invoice per student
  per period).
- `TutorPayout(tutorId, period)` — unique.
- `RefreshToken.tokenHash` — unique; `RefreshToken(userId)` indexed for
  bulk revocation on logout-everywhere/password change.
- Every branch-scoped table carries `branchId` with an FK + index — this is
  what the authorization layer relies on to enforce tenant isolation.
- Attendance-percentage-never-exceeds-100% is enforced in the **service
  layer** at write time (computed from `ClassSession`, not stored/trusted as
  a raw input) rather than a DB check constraint, since it's a derived value.

## Deliberately not modeling (yet)

- Traditional class/batch/timetable-template entities — this is a
  tutor↔student pairing model, not a classroom-scheduling model.
- Multi-currency — INR only for now.
- Soft-delete on every table — using explicit `status` enums instead, which
  is what the reports actually need (e.g. `INACTIVE` tutors still need to
  show in historical payout reports).

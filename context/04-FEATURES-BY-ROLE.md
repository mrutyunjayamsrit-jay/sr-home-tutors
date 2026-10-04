# Features by Role

This mirrors the actual nav structure (`apps/web/src/app/navConfig.ts`) —
each heading below is a real nav tab. Nothing here is aspirational; every
line has a working backend module + frontend page behind it.

## Super Admin (`ADMIN_NAV`, routes under `/admin`)

- **Dashboard** — institute-wide live stats: total/active branches,
  registered tutors, registered students, per-branch enquiry counts.
- **Branches** — create branches (name, code, address, contact), view a
  branch detail page, create/manage that branch's Branch Admin login,
  Super-Admin-only branch password reset.
- **Users & Roles** — cross-branch user administration: search, filter by
  role (native `<select>`, must stay re-selectable back to "All roles" —
  see `08-KNOWN-GAPS.md` history), create any-role login, disable/re-enable
  a user, and a Super-Admin-only **permanent delete** (typed confirmation
  phrase required) distinct from soft-disable.
- **Fee Rate Cards** — Super-Admin-only: set `ratePerClass` per branch ×
  board × class-category bucket, deletable. Read-only to Branch Admin
  elsewhere (their own branch's cards, used when raising an invoice).
- **Fees** — the office fee-invoice workflow (see Branch Admin section;
  Super Admin sees it institute-wide).
- **Expenses** — same, institute-wide view of branch expense ledgers.
- **Subjects & Areas** — maintain the master Subject list (global) and Area
  list (per branch) that feed the tutor/parent enquiry forms' pickers.
- **Tasks** — assign a task to one branch (title/description/due date),
  see completion status across every branch.
- **Announcements** — publish institute-wide (no branch) or one-branch
  announcements, targeted by audience (everyone/tutors/parents/students/
  branch-staff), with a "this is a referral bonus" flag that also surfaces
  the announcement as a banner directly on the tutor/parent Refer pages.
- **Parent Queries** — see and answer every parent question, both
  branch-targeted and Super-Admin-targeted ones (a Branch Admin only sees
  their own branch's branch-targeted ones).
- **Reports** — five tabs, all with a from/to date range + branch filter +
  CSV export, computed live from real Assignment/ClassSession/Invoice
  data, never a cached number:
  1. **Tutor Attendance** — per-assignment present/absent/hours/short-class
     count.
  2. **Student Attendance** — per-assignment classes-attended/chapters/
     hours.
  3. **Tutor Payments** — one row per tutor, real payable/paid/outstanding,
     with a "mark as paid" action and a **click-to-open detail dialog**
     (profile + attendance + payment breakdown + per-student assignment
     list, same date window as the report row).
  4. **Student Fees** — one row per invoice, payable/paid/balance/status,
     also **click-to-open detail dialog** (profile + full invoice history +
     attendance for the window + assigned-tutor list).
  5. **Parent Enquiry Fees** — prescribed vs. agreed-final fees per
     enquiry, so Super Admin can see the negotiation gap across every
     branch.
- **Settings** — org name, support email/phone, and the tutor
  rules-acknowledgment text — all live in `OrgSettings` (see 03), editable
  without a redeploy.

## Branch Admin (`BRANCH_NAV`, routes under `/branch`)

Everything below is scoped to their own branch only (forced server-side,
never trusts a client-supplied branchId).

- **Dashboard** — branch-local live stats, an "attendance tile" quick
  check-in/out shortcut.
- **Enquiries** — two tabs (Tutor Enquiries / Parent Enquiries): raise a
  new one, search, change status (New/In Review/Accepted/Rejected),
  **Register** (convert) a tutor or parent enquiry into a real
  login-holding profile in one action.
- **Registration** — view registered Tutors/Parents/Students for the
  branch.
- **Assign Tutor** — match a registered tutor to a registered student:
  subjects, weekly schedule (days + time slot), per-class rate or fixed
  salary, fixed classes/month — generates the recurring `ClassSession` rows
  for a rolling horizon on save.
- **Class Attendance** *(nav label deliberately distinct from "My
  Attendance" below — see `08-KNOWN-GAPS.md`)* — every scheduled class for
  a chosen date across the whole branch, mark each as
  completed/absent-student/absent-tutor/cancelled.
- **My Attendance** — the Branch Admin's *own* personal daily office
  check-in/check-out (a completely different feature from the one above —
  this is `StaffAttendance`, not `ClassSession`). Checkout requires the
  real elapsed time since check-in to be ≥50 minutes (enforced
  server-side, mirrored client-side just for button state).
- **Tasks** — see and complete tasks Super Admin assigned to this branch.
- **Fees** — raise a `StudentFeeInvoice` for a student, record a payment
  against it (with an optional payment-proof file upload), see
  payable/paid/balance.
- **Reports** — the same five report tabs as Super Admin, scoped to this
  branch only (no branch filter shown), same detail-dialog behavior on
  Tutor Payments/Student Fees.
- **Accounts** — record branch expenses.
- **Announcements** — publish to this branch only (no institute-wide
  option), same referral-bonus flag as Super Admin's version.
- **Parent Queries** — see and answer this branch's `BRANCH`-targeted
  questions only (never the Super-Admin-targeted ones).
- **Branch Profile** — edit the branch's **address only**; name/email/
  phone changes are Super-Admin-only by design (prevents an office from
  quietly rebranding itself).

## Tutor (`TUTOR_NAV`, routes under `/tutor`)

Gated behind a **daily rules-acknowledgment modal** (`RulesGate`,
non-dismissible until checked+submitted) before anything else renders —
text comes from `OrgSettings.tutorRulesText`.

- **Dashboard** — today's classes, quick stats.
- **My Students** — every currently-assigned student.
- **Timetable** — weekly recurring schedule across all assignments.
- **Attendance** — today's (or a chosen date's) scheduled classes; **Check
  In**/**Check Out** buttons gated by real GPS proximity to the student's
  home (`useProximityStatus`) and, for checkout, a real ≥ (configurable,
  default 50 min) elapsed-time gate mirrored from the server. Manual
  fallback (typed area) when location isn't available.
- **Tests & Marks** — enter test results per assignment.
- **Study Materials** — upload/share materials with assigned students
  (feeds the `MATERIAL` `DocumentOwnerType`).
- **Earnings** — the tutor's own payment report (per-assignment payable,
  not the office aggregate view).
- **Reports** — the tutor's own attendance/payment reports, self-scoped
  automatically (no branch-wide access at all).
- **Refer a Student** — reuses the exact same Parent Enquiry create
  form/API the office uses; the tutor only ever sees referrals *they*
  personally submitted, never the branch's whole pipeline. Shows a
  referral-bonus banner if Super Admin/Branch Admin has published one.
- **Refer a Tutor** — same pattern, for the Tutor Enquiry pipeline
  instead.

## Parent (`PARENT_NAV`, routes under `/parent`)

Read-only except for the two write actions explicitly listed (refer,
ask-a-question). No fee/payment visibility is ever exposed to Student.

- **Dashboard** — child-switcher (if more than one), quick stats.
- **Attendance** — their child(ren)'s class attendance history.
- **Performance** — test marks/reviews.
- **Fees** — invoices, balances, payment history for their child(ren).
- **Timetable** — their child(ren)'s weekly schedule.
- **Study Materials** — materials the tutor has shared.
- **Announcements** — institute + own-branch announcements targeted at
  parents.
- **Refer a Parent** — reuses the same Parent Enquiry form; sees only
  their own submitted referrals. Shows the referral-bonus banner too.
- **Ask a Question** — send a question to their own branch office *or*
  straight to Super Admin (their choice); sees the reply appear in the
  same list once answered, with a badge for Awaiting-reply/Answered.

## Student (routes under `/student`)

A lightweight addition beyond the original source spec (documented as a
confirmed decision in `docs/DECISIONS.md`) — the same read-only slice as
Parent (attendance, marks, timetable, materials, announcements/
notifications) with **zero fee/payment visibility**, on the reasoning that
a minor shouldn't see billing detail even if they have their own login.

## Cross-cutting (every role)

- **Notification bell** — generic in-app notifications (task assigned/
  completed, attendance reminders, branch-missed escalations, short-class
  escalations, parent-query asked/answered, referral submissions). Polled,
  idempotent via `dedupeKey`, mark-one/mark-all-read.
- **Public marketing site** (`/`, unauthenticated) — a "Request a Tutor"
  public enquiry form (feeds `ParentEnquiry` with a sentinel
  `createdById`), institute description pulling `OrgSettings.
  organizationName`, and a link to the staff/portal login.

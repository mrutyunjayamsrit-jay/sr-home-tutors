# Product Overview

## What this is

A **multi-branch home-tutoring agency management platform** — not a
school/classroom/batch system. One institute ("SR Home Tutors" in the
current build) runs several physical **branch offices**; each branch has its
own office staff, its own roster of home tutors, and its own families. A
Super Admin oversees the whole institute across every branch.

The core business process is a funnel, and the whole app is built around
making each stage of it real and auditable:

```
Tutor Enquiry ──▶ Registered Tutor ─┐
                                      ├─▶ Assignment ──▶ Running Class ──▶ Attendance ──▶ Payroll / Fees
Parent Enquiry ──▶ Registered Parent ┘         (weekly recurring schedule)
```

- A **tutor enquiry** or **parent enquiry** (a lead) is raised — by office
  staff, by a tutor referring another tutor, by a parent referring another
  family, or from the public marketing site's "Request a Tutor" form.
- The branch office reviews it and, when accepted, **converts** it into a
  registered Tutor or a registered Parent+Student — this single action both
  marks the enquiry accepted and provisions a real login.
- The office **assigns** a tutor to a student (subjects, weekly schedule,
  per-class rate, fixed classes/month) — this generates the recurring class
  sessions automatically for a rolling horizon.
- Each scheduled class becomes a real **attendance** event: the tutor
  checks in/out (location-verified against the student's home), or the
  office marks it manually. Attendance data feeds two live-computed things
  that must never drift from what actually happened: **tutor payroll**
  (payable = classes actually taken × rate) and **student fees**.
- Everything downstream — reports, payments owed, outstanding balances — is
  computed live from real Assignment/ClassSession/Invoice rows, never from a
  separately-maintained counter that could go stale.

## Who uses it (roles)

| Role | Scope | How they get an account |
|---|---|---|
| **Super Admin** | Every branch, institute-wide | Seeded at first deploy |
| **Branch Admin** ("office assistant" in the source spec) | Own branch only | Created by Super Admin |
| **Tutor** | Own profile + own assigned students | Provisioned when their enquiry is converted (accepted) |
| **Parent** | Own profile + own children | Provisioned when their enquiry is converted (accepted) |
| **Student** | Own academic data only, read-only, no fee visibility | Auto-provisioned alongside the parent at conversion |

Every domain row belongs to exactly one branch (`branchId`); the API forces
non-Super-Admin actors onto their own branch on every read and write — this
is the single most important security property of the whole system and is
applied consistently module by module (see 02).

## What each role can actually do, in one paragraph each

(Full detail in [04-FEATURES-BY-ROLE.md](04-FEATURES-BY-ROLE.md).)

- **Super Admin** oversees every branch: creates branches and Branch Admin
  logins, sets fee rate cards, manages the master Subjects/Areas lists,
  assigns tasks to branches, publishes institute-wide or branch-targeted
  announcements (including flagged "referral bonus" ones), answers parent
  questions addressed to them directly, runs every report (attendance,
  tutor payments, student fees, parent-enquiry fee tracking) with a
  click-through detail dialog per tutor/student, and edits org-wide settings
  (name, support contact, tutor rules text).
- **Branch Admin** runs one branch day to day: works the enquiry pipeline,
  registers tutors/parents, assigns tutors to students, marks/oversees class
  attendance, raises and reconciles student fee invoices and tutor payouts,
  tracks branch expenses, manages their own daily office check-in/out
  (distinct from tutor class attendance), completes tasks Super Admin
  assigned them, answers parent questions addressed to their branch, and
  edits their own branch's address (name/email/phone stay Super-Admin-only).
- **Tutor** sees their assigned students, timetable, and today's classes;
  checks in/out per class (geofenced to the student's home); records test
  marks and reviews; sees study materials they've shared; sees their own
  earnings/payment report; must re-acknowledge the institute's rules on
  every login before anything else loads; and can refer another student
  *or* another tutor for the office to review.
- **Parent** gets a read-only portal for their child(ren): attendance,
  performance/test marks, fees (invoices, balances, payment history),
  timetable, study materials, and institute announcements; can refer another
  family; and can ask a question addressed either to their own branch
  office or straight to Super Admin, with the reply appearing back in the
  same place once answered.
- **Student** gets the same read-only slice as the parent, minus anything
  fee/payment-related — attendance, marks, timetable, materials,
  announcements.

## Where the current business rules/text still say "India"

- Currency is implicitly INR everywhere (₹ literal in UI, no currency
  field/locale switch).
- Government ID types on enquiry forms are Aadhar / Voter ID / Driving
  License / Passport / Other.
- Boards are State Board / CBSE / ICSE / Other.
- Location features (attendance geofencing) assume lat/long in a plausible
  India range but aren't hardcoded to India specifically — they'd work
  anywhere, the ID-type list is the only India-specific enumeration baked
  into the schema.

None of this blocks reuse outside India, but a new customer serving a
different country would want the ID-type enum and currency literal changed
— see [06-REBRANDING-CHECKLIST.md](06-REBRANDING-CHECKLIST.md).

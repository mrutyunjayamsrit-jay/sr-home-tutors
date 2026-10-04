# Key decisions & assumptions

Decisions confirmed with the product owner are marked **(confirmed)**; the rest are
reasonable engineering defaults made to keep moving — flagged here rather than
buried silently, per the brief's instruction to surface assumptions explicitly.

## Confirmed with product owner

1. **Student role (confirmed)** — The source spec has no student login (only a
   parent login exposing child data). We're adding a lightweight, auto-provisioned
   **Student** login: read-only access to own attendance, tests/marks, timetable,
   study materials, notifications. Fees/payment data stays parent-only.
2. **Database (confirmed)** — PostgreSQL + Prisma, for relational integrity and
   multi-table financial/attendance reporting.
3. **Google OIDC scope (confirmed)** — Google Sign-In is available only for
   `SUPER_ADMIN` and `BRANCH_ADMIN`. Tutors/parents/students use admin-issued
   password credentials (forced reset on first login). Phone/OTP login is a
   documented future improvement, not built now (would require an SMS provider
   contract/cost decision).
4. **Payroll formula (confirmed)** — Tutor payable amount = per-class rate ×
   classes actually taken in the period. Per-class rate is derived at assignment
   time (either set directly or as fixed salary ÷ fixed classes) and stored
   explicitly on the Assignment so it doesn't silently drift if the salary is
   edited later. Manual adjustment line items (bonus/deduction, e.g. travel
   reimbursement) are supported per payout period.

## Engineering defaults (not asked, low-impact / reversible)

- **Language**: TypeScript on both frontend and backend (source spec didn't
  specify; this is close to a non-negotiable for a codebase of this size and
  security sensitivity).
- **Monorepo** with npm workspaces (`apps/api`, `apps/web`) — simpler local dev
  and shared tooling than split repos; can be split later if needed.
- **ORM**: Prisma.
- **Password issuance**: admin actions generate a secure one-time temporary
  password / invite token rather than an admin-chosen plaintext password —
  same UX as the spec's "office assistant creates the login," minus the
  security hole of a human-chosen or emailed-in-clear password.
- **Auto-generated login IDs** (first 3 letters of name + last digits of phone,
  per spec) are usernames only, not secrets — collision-checked and suffixed.
  This is a convenience feature, not an auth boundary.
- **Status lifecycle** added to Tutor/Parent/Student beyond what the spec
  states: `ENQUIRY → REGISTERED → ASSIGNED → ACTIVE → INACTIVE`. Any real
  agency needs an "inactive/dropped" state; the spec never mentions one.
- **File storage**: abstracted behind a `StorageProvider` interface — local
  disk in development, swappable for S3-compatible storage in production
  without touching business logic.
- **Currency/locale**: INR, India-based (inferred from Aadhar/Voter ID/DL and
  CBSE/ICSE/State board references in the source spec).
- **Notifications/announcements module**: present in your original brief,
  only lightly implied in the source spec — building a minimal version
  (in-app + email) now; SMS/push are future improvements.

## Known accepted risk

- `apps/web`'s Vite dev server (via `vitest`'s and `vite`'s own transitive
  `esbuild`) carries a moderate/high advisory (GHSA-67mh-4wv8-2f99 and
  related) that's only fully fixed in Vite 8, which requires Node
  `^20.19 || >=22.12`. The current dev environment runs Node 20.12. Since
  this only affects the **local development server** (a malicious website
  open in the developer's browser could probe `localhost` while `npm run
  dev` is running — production builds are static files, unaffected), we're
  deferring the major-version bump rather than risk breaking the dev
  toolchain on an incompatible Node version. **Action before this goes to a
  shared/CI environment**: upgrade Node to 22 LTS and bump `vite`/`vitest`
  to their latest majors, then re-run `npm audit`.

## Open items to revisit later (not blocking foundation work)

- Deployment target (which cloud, container orchestration) — not yet chosen.
- SMS/OTP provider for phone-based login, if/when that's prioritized.
- Whether Branch Admins can see cross-branch aggregate reports (currently:
  no — only Super Admin sees cross-branch data; branch admins see their own
  branch only). Flag if that's wrong for your business model.
- Multiple children per parent account: supported in the data model (a Parent
  can have many Student rows), with a child-switcher in the parent UI, since
  the source spec doesn't explicitly forbid it and it's a common real need.

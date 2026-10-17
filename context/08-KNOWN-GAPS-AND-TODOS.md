# Known Gaps, TODOs, and Doc/Code Drift

Things that are scaffolded but unfinished, known limitations worth knowing
about before extending the app, and a couple of places the *old* `docs/`
folder describes something that isn't actually true in the code anymore —
worth reading once so a future session doesn't repeat an assumption the
code has since drifted away from.

## 1. File storage — RESOLVED

~~Was~~: `documents.service.ts` only ever wrote to local disk;
`STORAGE_PROVIDER=s3` and the `S3_*` env vars existed in `env.ts` but
nothing read them. **Now fixed** — `documents.service.ts` has a real
`storageWrite`/`storageRead`/`storageDelete` abstraction using
`@aws-sdk/client-s3`, gated on `env.STORAGE_PROVIDER`, validated with a
full upload→list→download→delete cycle in local mode. See
`07-DEPLOYMENT.md`.

**`docs/DECISIONS.md` claims** *"File storage: abstracted behind a
`StorageProvider` interface — local disk in development, swappable for
S3-compatible storage in production without touching business logic."*
This was aspirational/inaccurate at the time it was written (no such
interface existed yet) — it's now **actually true**, just not via a
formally named `StorageProvider` interface, three plain functions
(`storageWrite`/`storageRead`/`storageDelete`) instead. Update or remove
that line in `docs/DECISIONS.md` next time someone's in there; not urgent
since the underlying claim is no longer false, just imprecisely named.

## 2. Branding not fully wired to `OrgSettings`

`AppShell.tsx` (the logged-in header, every role, every page) and
`LoginPage.tsx` hardcode `"SR Home Tutors"` in JSX rather than reading
`OrgSettings.organizationName` the way `HomePage.tsx` (the public marketing
page) already correctly does. Worth fixing once — see
`06-REBRANDING-CHECKLIST.md` — so every future customer's rebrand is purely
a Settings-page edit for *this* part too, not a code change.

## 3. Reports date-range timezone edge case — RESOLVED

~~Was~~: `reportQuerySchema`'s `from`/`to` fields parsed a plain
`"YYYY-MM-DD"` query param (what every `<input type="date">` on the
Reports page sends) as **UTC midnight** via plain `z.coerce.date()`. On
this IST (UTC+5:30) server, that boundary sits 5.5 hours before the actual
start/end of that day in India — a same-day record created later in the
IST day could fall just outside a report's `to` filter until the UTC day
rolled over. Affected every report tab (Tutor Attendance/Payments,
Student Attendance/Fees, Parent Enquiry Fees, the tutor/student detail
dialogs) and the tutor-payout `markTutorPaidSchema`. **Now fixed** —
`reportQuerySchema`/`markTutorPaidSchema`/`detailQuerySchema` (all in
`reports.types.ts`) pipe `from`/`to` through `common/utils/istDate.ts`'s
`istStartOfDay`/`istEndOfDay` via a zod `.transform()`, so every consumer
of these schemas gets the correct IST day boundary automatically. Verified
live under `TZ=UTC` (reproducing the Oracle VM's condition): parsing
`{from: "2026-10-17", to: "2026-10-17"}` correctly resolved to
`2026-10-16T18:30:00.000Z`–`2026-10-17T18:29:59.999Z` (exactly midnight to
23:59:59 IST on Oct 17), not the UTC day.

## 4. Frontend bundle size

`vite build` reports the main JS chunk at ~590KB / ~160KB gzipped, over
Vite's default 500KB warning threshold. Not a functional problem today, but
if the app keeps growing per-customer, worth revisiting with
`build.rollupOptions.output.manualChunks` or route-level `React.lazy()` code
-splitting (the app's route tree in `App.tsx` is already cleanly organized
by role, which would make lazy-loading each role's route subtree a natural
split point).

## 5. `docs/` folder is stale — decide what to do with it

`docs/README.md` and `docs/ARCHITECTURE.md` describe a "🚧 Foundation
phase" with modules like enquiries/assignments/attendance/fees/reports
listed as "next" — all of them have been fully built for a long time, plus
roughly a dozen modules (`announcements`, `tasks`, `parent-queries`,
`master-data`, `staff-attendance`, `documents`, `settings`, `family`,
`tests`, `reviews`, `users`, `public`, and the whole `referrals`/refer-a-
tutor/refer-a-parent frontend feature set) that `docs/ARCHITECTURE.md`'s
folder-structure diagram doesn't mention at all. `docs/DECISIONS.md` is
still genuinely useful (the confirmed-decisions log is accurate history)
and `docs/API.md`/`docs/DATA-MODEL.md` weren't reviewed as part of building
this `context/` folder — check them before trusting them. Recommendation:
either update `docs/` to match current reality, or explicitly mark it
superseded-by-`context/` and stop maintaining it (this `context/` folder
already does that in its own `README.md`, but `docs/` itself doesn't say
so, which means someone opening `docs/` cold would be misled).

## 6. Security advisory noted in `docs/DECISIONS.md` — re-check before CI/shared use

At the time `docs/DECISIONS.md` was written: `apps/web`'s Vite dev server
(via `vitest`/`vite`'s transitive `esbuild`) carried a moderate/high
advisory, fully fixed only in Vite 8 (needs Node `^20.19 || >=22.12`), and
the dev environment was on Node 20.12 at the time. Only affects the local
dev server, not production static builds. **Re-run `npm audit` and check
current Node version before this project ever runs in a shared/CI
environment** — this may already be resolved by dependency updates since
that note was written; don't assume either way without checking.

## 7. Fixed bugs worth knowing the history of (so they don't get reintroduced)

- **`Select` component's placeholder option must never be `disabled`.**
  It was originally `<option value="" disabled>`, which meant that once a
  user picked a real filter value (e.g. a role in Users & Roles), the "All
  ..." placeholder became permanently unselectable for the rest of that
  page visit — a real reported bug. Fixed in `components/ui/Select.tsx` by
  removing `disabled`. This is a shared component used everywhere, so the
  fix applies globally — if a future change to `Select` reintroduces
  `disabled` on that option "to look more obviously like a placeholder,"
  it reintroduces this bug across every filter in the app.
- **"Attendance" vs. "My Attendance" naming** — the Branch Admin nav used
  to have two tabs both effectively labeled "Attendance," which was
  genuinely ambiguous: one is every tutor's *class* attendance across the
  branch (`ClassSession` data), the other is the Branch Admin's *own*
  personal daily office check-in/out (`StaffAttendance` data) — two
  different database tables, two different purposes, that happened to
  collide on the same word. Renamed the first to **"Class Attendance"** to
  disambiguate. If a new customer's Branch Admin nav ever grows a third
  attendance-adjacent feature, give it an equally specific label rather
  than reusing the bare word "Attendance."
- **The compiled production build could never actually start.**
  `tsc -p tsconfig.json` (the `build` script) type-checks and emits `.js`,
  but never rewrites the `@/*` path aliases used in every import
  throughout `apps/api/src` into real relative paths — Node has no idea
  what `@/` means at runtime, so `node dist/server.js` failed immediately
  with `Cannot find module '@/config/env'`. This had never been caught
  before because verification throughout this project's history ran
  `tsc --noEmit` (type-check only) and `vite build`, never an actual
  `npm run build && npm start` of the API. Fixed by adding `tsc-alias` as
  a required post-build step (`"build": "tsc -p tsconfig.json && tsc-alias
  -p tsconfig.json"`) — if a future change to the build script drops that
  second half, the compiled output silently stops being runnable again
  even though typecheck/lint/`tsc --noEmit` all still pass clean.
- **Prisma's Alpine (musl) engine binary didn't match `node:20-alpine`'s
  actual OpenSSL version.** Surfaced only when the API was actually
  containerized and run for the first time (see `deploy/README.md`) — the
  Docker build succeeded and the app booted, but every Prisma query failed
  at runtime with a `libssl.so.1.1: No such file or directory` error,
  because the default/native musl engine target assumes OpenSSL 1.1 while
  modern Alpine ships OpenSSL 3.x. Explicitly adding a
  `linux-musl-openssl-3.0.x` binary target did **not** fully fix it either
  (a genuine engine-selection mismatch at container runtime, not just a
  missing target). Fixed by moving the Dockerfile's base image from
  `node:20-alpine` to `node:20-slim` (Debian) with an explicit
  `debian-openssl-3.0.x` binary target in `schema.prisma` — Debian avoids
  this whole class of musl/OpenSSL-variant issue, which is why the
  Dockerfile deliberately doesn't use Alpine despite Alpine's smaller
  image size. If anyone "optimizes" the Dockerfile back to Alpine later
  to shrink the image, expect this exact failure to come back — validate
  a real containerized login, not just a successful `docker build`, before
  trusting an Alpine-based change here.
- **Tutor/staff check-in times were off by exactly 5.5 hours in
  production.** `staff-attendance.service.ts` used to reconstruct a
  check-in `Date` server-side from a bare `"HH:mm"` string the client sent
  (`combined.setHours(h, m, 0, 0)`), and separately bucketed "which day"
  an attendance row belongs to via `new Date(d.getFullYear(), d.getMonth(),
  d.getDate())` — both of these interpret their inputs in the **server
  process's own OS timezone**, not any fixed zone. On the dev machine
  (coincidentally set to IST) this looked correct; on the Oracle Cloud VM
  (which defaults to UTC like most fresh cloud images) the exact same code
  silently shifted every check-in time forward by 5.5 hours and could
  bucket a late-night check-in onto the wrong calendar day — this is
  specifically what surfaced as a tutor-facing complaint after deploying.
  `attendance.service.ts`'s class-session date filtering had the identical
  latent bug (same `getFullYear()`/`setHours()` pattern), just not yet
  reported since typical class hours sit comfortably away from the
  IST/UTC midnight boundary. Fixed by: (1) adding
  `common/utils/istDate.ts` (`istStartOfDay`/`istEndOfDay`/
  `istFirstOfMonth`), which computes IST calendar-day boundaries via
  explicit offset math, never local `Date` getters/setters; (2) having the
  client send a full ISO instant (`at`, built from the browser's own local
  time — the browser's OS timezone is the only one that's actually
  relevant here, since it's the person's own device) instead of a bare
  `"HH:mm"` the server would have to guess a timezone for, mirroring the
  pattern `MarkSessionDialog.tsx`'s office-manual-entry flow already used
  safely. Verified live by running the compiled server with `TZ=UTC`
  (deliberately reproducing the Oracle VM's condition) and confirming a
  real check-in's stored `loginAt` exactly matched the instant sent, with
  the row correctly bucketed onto the IST calendar day. **If a future
  change reintroduces `new Date(d.getFullYear(), d.getMonth(), ...)` or
  `date.setHours(...)` anywhere time/day math is done server-side, this
  bug (or its day-bucketing sibling) comes back** — route any new
  "what day is this" or "combine a time with today" logic through
  `istDate.ts` instead, and never accept a bare time-of-day string from
  a client when a full instant will do.

  **Follow-up sweep** (same root cause, found by grepping the whole API
  for `getFullYear()`/`setHours()`/`getDate()`/`getMonth()`/`getDay()`/
  `toLocaleDateString` after the above was reported — the user explicitly
  asked for every similar instance to be found and fixed, not just the
  one reported): three more real occurrences existed, now all fixed the
  same way:
  - **`session-generator.ts`** — the most consequential one. Every newly
    generated `ClassSession`'s `scheduledStart`/`scheduledEnd` was built
    via the identical `date.setHours(h, m, 0, 0)` pattern from an
    assignment's `timeSlotStart`/`timeSlotEnd` — meaning **every class
    created while the server ran in UTC got scheduled 5.5 hours off**,
    not just attendance logging. Its weekly-recurrence day-iteration
    (`cursor`/`end` via local `getFullYear()`/`getMonth()`/`getDate()`,
    stepped via local `setDate()`) had a narrower but real edge case too:
    a Branch Admin creating an assignment between 18:30–23:59 UTC
    (00:00–05:29 IST, i.e. very late IST evening/early morning) could
    have the whole recurrence pattern start one calendar day off. Fixed
    using new `istDayOfWeek`/`istNextDay`/`istCombineDateAndTime`
    additions to `istDate.ts`. Verified live under `TZ=UTC`: a
    4:00 PM–5:20 PM IST weekly class now generates sessions at exactly
    4:00 PM/5:20 PM IST, not 9:30 PM/10:50 PM.
  - **`auth.service.ts`'s `hasAcknowledgedRulesToday`** — compared the
    rule-acknowledgment's local calendar fields against "today"'s local
    fields, so the daily tutor rules-gate's "already acknowledged today"
    check used the server's day, not IST's — could wrongly skip
    re-prompting (or wrongly re-prompt) right around the IST/UTC midnight
    gap. Fixed with a single `istStartOfDay(...).getTime() ===
    istStartOfDay(...).getTime()` comparison.
  - **`notifications.service.ts`** — all three lazily-materialized
    reminder/escalation functions (`ensureOwnAttendanceReminder`,
    `ensureBranchMissedEscalations`, `ensureShortClassEscalations`) had
    their own local `startOfDay`, plus a `formatDate` that called
    `toLocaleDateString("en-IN", ...)` **without** an explicit `timeZone`
    — the `en-IN` locale controls date *formatting conventions* (day/
    month order, etc.), not which timezone the date is read in, so this
    displayed the server's own day even with an India locale string.
    Dedupe-key date labels (`day.toISOString().slice(0, 10)`) had the
    same mislabeling issue — functionally harmless (still a stable,
    unique key) but confusing to read. Fixed by routing all of it through
    `istStartOfDay`/`istFirstOfMonth`/the new `istDateKey`/`formatIstDate`
    helpers.
  - **Reports date-range** (`reportQuerySchema`/`markTutorPaidSchema`/
    `detailQuerySchema`) — see item #3 above, now resolved the same way.

  Nothing else in the API matched this pattern as of this sweep (the only
  remaining `getFullYear`/`setHours`/etc. hits are inside `istDate.ts`
  itself, which is the one place that's supposed to do this math, and in
  comments). If a future grep for these turns up something new outside
  `istDate.ts`, treat it as this exact bug until proven otherwise.

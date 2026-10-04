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

## 3. Reports date-range timezone edge case

`reportQuerySchema`'s `to` field is parsed as a plain ISO date, which
`z.coerce.date()` resolves to **UTC midnight**. On a system in a
positive-UTC-offset timezone (this app runs in IST, UTC+5:30), a record
created "today" (local time) but after that UTC midnight boundary can fall
just outside a same-day report's `to` filter until the UTC day rolls over.
Affects every report tab equally (Tutor Attendance/Payments, Student
Attendance/Fees, Parent Enquiry Fees, and the new tutor/student detail
dialogs) — not a regression in any one feature, a pre-existing property of
how the date range is parsed. Not fixed because it's shared logic touching
five report types and wasn't the specific thing asked for when found — a
reasonable real fix would be treating `to` as "end of that day" (either
`to + 1 day` with `lt` instead of `lte`, or parsing it in the server's
configured timezone) applied consistently across `reports.repository.ts`'s
date-range queries.

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

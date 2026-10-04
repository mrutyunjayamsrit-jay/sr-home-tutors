# Architecture & Conventions

Read this before writing any code on this app or a clone of it. Every
convention below has been applied consistently across ~25 backend modules
and ~35 frontend features built over a long series of sessions — deviating
from it is how an AI-assisted codebase this size stops being maintainable.

## Tech stack

- **Backend**: Node.js ≥20, Express, TypeScript, Prisma ORM, PostgreSQL.
  `tsx watch` for dev, `tsc` build → `node dist/server.js` for prod (no
  bundler on the backend).
- **Frontend**: React 18, Vite, TypeScript, React Router v7, TanStack Query
  (server state), Zustand (small local UI state — e.g. the auth store),
  react-hook-form + `@hookform/resolvers/zod` (forms), Zod (validation,
  shared shape between client and server schemas where practical).
- **Monorepo**: npm workspaces, two packages — `apps/api`, `apps/web`. No
  shared package between them; Zod schemas are duplicated (client-side copy
  is UX-only, server-side copy is the real trust boundary).
- **Auth**: password (bcrypt) for every role; Google OIDC additionally
  available for `SUPER_ADMIN`/`BRANCH_ADMIN` only, verified server-side
  (`openid-client`, checks `iss`/`aud`/`exp`/`email_verified`, never
  auto-creates an account — only links to an existing one by verified
  email). Short-lived JWT **access** token returned in the response body and
  held in memory only on the client (never `localStorage`); long-lived JWT
  **refresh** token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie.
  Admin-issued accounts (tutor/parent/student) get a forced password reset
  on first login — no permanent plaintext-issued passwords.

## Folder layout

```
apps/
  api/
    src/
      config/env.ts        # zod-validated env config, loaded once at boot — see below
      middleware/           # authenticate, authorize(roles), validate(schema), rate limiting, error handler
      common/
        errors/AppError.ts  # NotFoundError / ForbiddenError / ValidationError / ConflictError → mapped to HTTP centrally
        prisma.ts           # the one PrismaClient instance
        utils/               # asyncHandler, apiResponse (ok/created/noContent/paginationMeta), csv export
        access/family.ts     # shared "does this parent own this student" helpers, used by several modules
        constants/            # shared numeric thresholds (attendance geofence, short-class minutes, etc.)
      modules/<name>/
        <name>.routes.ts      # wires HTTP verb+path → middleware chain → controller method
        <name>.controller.ts  # parses req via zod schema, calls service, shapes the HTTP response — no business logic
        <name>.service.ts     # business logic, orchestration, transactions, access checks — NO express types here
        <name>.repository.ts  # Prisma queries only, no business logic (only present in modules complex enough to need it — many lighter modules query Prisma directly from the service)
        <name>.types.ts       # zod schemas + inferred TS types for request/response shapes
      routes/index.ts        # mounts every module's router onto /api/<path>
      app.ts / server.ts
    prisma/
      schema.prisma
      migrations/            # see "Migrations" below
      seed.ts
  web/
    src/
      app/                   # App.tsx (route tree), AppShell.tsx (shared layout+nav), navConfig.ts (per-role nav arrays), ProtectedRoute.tsx
      components/ui/         # the ENTIRE design system — Button, Card, TextField, Select, MultiSelectDropdown, Checkbox, Modal, DataTable, Badge, Spinner, EmptyState, toast. Always reuse these, never hand-roll a new input/button/table.
      features/<name>/
        <name>Page.tsx        # the page component, uses AppShell
        api.ts                 # TanStack Query hooks (useX, useCreateX, ...), all HTTP calls live here, never inline fetch in a component
        types.ts               # TS interfaces mirroring the backend's response/request shapes
        Create*Dialog.tsx      # Modal-based create/edit forms, react-hook-form + zod
      lib/                    # small cross-feature pure-function utilities (e.g. studentCategoryOptions.ts, rateCardMatch.ts)
      styles/tokens.css       # design tokens — see 06 for theming
docs/                        # OLDER docs, now partially stale — see context/README.md
context/                     # THIS folder
```

## Backend conventions (apply to every new module)

1. **Layering is real, not decorative.** Routes only wire paths to
   middleware/controllers. Controllers only parse+call+shape. Services hold
   every business rule and every access check. If you find yourself writing
   an `if (actor.role === ...)` in a controller or a route file, move it to
   the service.
2. **RBAC**: `authorize("SUPER_ADMIN", "BRANCH_ADMIN", ...)` middleware
   gates *which roles can hit the route at all*; the service layer then
   does the *fine-grained, per-row* check. The recurring pattern:
   - `resolveBranchIdForCreate(actor, requestedBranchId)` — BRANCH_ADMIN
     (and any role that only ever acts within their own branch, e.g. TUTOR/
     PARENT submitting a referral) is **forced** onto `actor.branchId`,
     ignoring whatever branchId the client sent, not just validating it.
     SUPER_ADMIN must explicitly pass one.
   - `assertBranchAccess(actor, ownerBranchId)` — SUPER_ADMIN always passes;
     everyone else must have `actor.branchId === ownerBranchId` or gets a
     403.
   - For "you can only touch your OWN submission" cases (a tutor's referral,
     a parent's referral, a parent's question) there's an additional
     `createdById`/`askedById` check layered on top of the branch check —
     see `enquiries.service.ts`'s `assertOwnEnquiryAccess` and
     `parent-queries.service.ts`'s `assertAnswerAccess` for the canonical
     shape.
   - Status-change / "convert to registered" / "answer" actions that
     provision real logins or commit the institute to something are
     deliberately kept **office-only** even when the *read* path is opened
     up to tutors/parents — never let a referrer or a parent self-approve
     their own submission.
3. **Every list endpoint takes `page`/`pageSize`** (paginated response via
   `paginationMeta`) except a handful of genuinely small, non-paginated
   lookups (Subjects, Areas, Rate Cards for one branch).
4. **Live-computed, never cached.** Payable/paid/outstanding, attendance
   present/absent counts, everything in Reports — always computed from the
   real Assignment/ClassSession/Invoice/Payout rows at request time, never
   from a separately-maintained counter column that could silently drift.
   The one exception is `TutorPayout`/`StudentFeeInvoice`, which are real
   committed records of an actual payment event, not a cache of a
   calculation — they're written once, by one specific action, and read
   back as history.
5. **Idempotent, lazily-materialized side effects.** Two established
   patterns, both worth reusing rather than reinventing:
   - **Notifications** use a unique `dedupeKey` (e.g.
     `attendance-reminder:{userId}:{date}`, `task-assigned:{taskId}:{userId}`)
     and `prisma.notification.upsert()` — so a route that can be hit
     multiple times (page reloads, retries) never spawns duplicate
     notifications. See `notifications.service.ts`.
   - **Lazy default-seeding on read**: if a list endpoint would otherwise
     return empty and there's a sensible default (e.g. the Subjects picker
     with nothing added yet), seed the defaults on that first read rather
     than requiring a separate seed step. See `master-data.service.ts`'s
     `listSubjects`.
6. **Soft-delete is the default for domain data** — most entities move
   through a `status` enum (`REGISTERED → ASSIGNED → ACTIVE → INACTIVE`,
   `OPEN → ANSWERED`, `PENDING → COMPLETED`, etc.) rather than ever being
   row-deleted, so history/reports stay intact. **User accounts are the
   deliberate exception**: they support both a soft `DISABLED` status *and*
   a genuine hard-delete endpoint (Super Admin only, requires typing a
   confirmation phrase) for cases like GDPR-style removal requests — don't
   assume every module has a hard-delete path just because Users does.
7. **Validation**: every request body/query/params gets a Zod schema, run
   through the shared `validate({ body, query, params })` middleware. Error
   messages are user-facing (`"Choose a gender"`, not `"invalid_enum_value"`).
8. **Errors**: throw the typed `AppError` subclasses
   (`NotFoundError`/`ForbiddenError`/`ValidationError`/`ConflictError`) from
   services; a central `errorHandler` middleware maps them to the right
   HTTP status and a consistent `{ success: false, error: { code, message } }`
   JSON shape. Never `res.status(...).json(...)` an error by hand inside a
   controller.
9. **Env config**: everything reads from `config/env.ts` (Zod-parsed once
   at boot), never `process.env` directly elsewhere. Secrets have no
   fallback in production — the process calls `process.exit(1)` on invalid
   config rather than booting insecurely. See `07-DEPLOYMENT.md`.

## Frontend conventions

1. **One feature folder per domain concept**, not a giant `pages/` dump —
   `features/enquiries`, `features/attendance`, etc. A feature folder owns
   its own `api.ts` (TanStack Query hooks), `types.ts`, and any
   page/dialog components.
2. **Never call `fetch`/`axios` from a component.** All HTTP lives in a
   feature's `api.ts` as a `useQuery`/`useMutation` hook; components only
   call the hook.
3. **Role-aware nav + routing**: `navConfig.ts` exports one `NavItem[]`
   array per role (`ADMIN_NAV`, `BRANCH_NAV`, `TUTOR_NAV`, `PARENT_NAV`),
   `App.tsx` nests each role's routes under a `ProtectedRoute
   allow={[...]}`. A page component gets its nav array as a prop when it's
   shared across roles (e.g. `AttendancePage`, `AnnouncementsAdminPage`) —
   check `useAuthStore`'s role to branch behavior/labels when a single
   component serves more than one role.
4. **Design system discipline**: every input/button/table/dialog goes
   through `components/ui/*`, never a hand-rolled `<input>`/`<button>`.
   `TextField`/`Select`/`MultiSelectDropdown`/`Checkbox` all accept
   `label`, `error`, `hint`; `Modal` wraps the native `<dialog>` element;
   `DataTable` takes `columns`/`rows`/`rowKey`/`onRowClick`/`emptyTitle`/
   `emptyDescription`/`isLoading`.
   - **`Select`'s placeholder option is never `disabled`** — a disabled
     placeholder makes it permanently unselectable again once a real value
     is chosen (this was a real, reported bug; see `08-KNOWN-GAPS.md`
     history section if a clone ever regresses it).
5. **Forms**: react-hook-form + `zodResolver`, one shared local `schema`
   per dialog, `register(...)` wiring, error text from `formState.errors`.
   For a field that should auto-prefill from server data without
   overwriting a value the user already typed, use
   `formState.dirtyFields` to guard the `setValue(...)` call (see
   `CreateParentEnquiryDialog.tsx`'s fee-rate-card prefill).
6. **Styling**: inline `style={{ ... }}` using CSS custom properties from
   `styles/tokens.css` (`var(--space-4)`, `var(--text-secondary)`, etc.) is
   the dominant pattern for one-off layout; CSS Modules
   (`Component.module.css`) are used for a component's own reusable
   styling. There's no Tailwind/styled-components in this codebase — don't
   introduce one without updating this doc.

## Database migrations (non-interactive workflow)

`prisma migrate dev` prompts interactively for "risky" changes, which fails
in a non-interactive shell. The established recipe instead:

```bash
cd apps/api
TS=$(date +%Y%m%d%H%M%S)
DIR="prisma/migrations/${TS}_<short_description>"
mkdir -p "$DIR"
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script > "$DIR/migration.sql"
# review the SQL, then:
npx prisma migrate deploy
npx prisma generate
```

**Windows-specific gotcha**: `prisma generate` fails with `EPERM` if the dev
server (which holds the query-engine `.dll.node` file open) is still
running. Fix: find and kill whatever's listening on the API port first —

```bash
netstat -ano | grep ":4000" | grep LISTENING   # find the PID
taskkill //F //PID <pid>
npx prisma generate
npm run dev > /tmp/api-dev.log 2>&1 &          # restart
```

## Verification discipline (do this after every change, not just at the end)

1. `npx tsc --noEmit` in the touched app(s).
2. `npx eslint <touched paths>`.
3. A real production build: `npm run build` in `apps/web` (runs `tsc` then
   `vite build`) and in `apps/api` (`tsc`).
4. **Live verification with headless Playwright** — never declare a feature
   done on typecheck/build alone. Log in as the real seeded test accounts
   (see below), exercise the actual flow end to end, assert on real page
   content. Known gotchas from this codebase specifically:
   - A `page.waitForLoadState("networkidle")` placed immediately after a
     click can resolve *before* the click's own fetch has even started —
     prefer `page.waitForURL(...)` for navigation, or `locator.waitFor({
     state: "visible" })` for content that loads asynchronously after a
     tab/nav change.
   - Native `<dialog>`-based `Modal`s stay in the DOM (just closed) even
     when not open, so `getByLabel`/`getByRole` can match a *closed*
     dialog's fields too — scope queries to the open dialog via
     `page.getByRole("dialog", { name: "..." })` or filter by
     `isVisible()`.
   - This app runs in IST (UTC+5:30); a report's `to` date filter parses
     as UTC midnight, so "today's" data created after local midnight but
     before UTC midnight can appear to fall just outside the filtered
     window in a quick same-day test — widen the range by a day rather
     than treating it as a real bug (though it's a legitimate pre-existing
     quirk worth fixing properly someday — see `08-KNOWN-GAPS.md`).
5. **Clean up every scratch artifact afterward** — delete any temp
   super-admin test account, any test rows created during Playwright runs,
   and every scratch script, before considering the task done. Never leave
   test data mixed into what will become real production data.

## Seeded accounts for local dev/testing

`npm run seed` (guarded — refuses demo accounts against a database with
`NODE_ENV=production` unless `ALLOW_TEST_SEED=true`) creates:

- A real bootstrap Super Admin (`SUPER_ADMIN_EMAIL`, defaults to
  `admin@<brand>.example`; password from `SUPER_ADMIN_PASSWORD` or a
  printed one-time random one).
- Demo accounts for every role, one shared password (`TEST_USER_PASSWORD`,
  defaults to `DevTest@12345`): `admin@test.com` / `branch@test.com` /
  `tutor@test.com` (username `tutortest`) / `parent@test.com` (username
  `parenttest`) / `student@test.com`, all attached to one seeded "Test
  Branch" (code `TEST01`). These are what every Playwright verification in
  this project's history has logged in as — reuse them rather than creating
  fresh test users per session where possible (create-and-delete a temp
  Super Admin only when you specifically need a *second* Super Admin, e.g.
  to test institute-wide vs. own-branch scoping).

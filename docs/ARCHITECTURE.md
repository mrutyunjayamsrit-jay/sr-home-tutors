# SR Home Tutors — Architecture

## 1. What this system is

A multi-branch **home-tutoring agency management platform** (not a classroom/batch-based
school system). The core business process is a funnel:

```
Tutor Enquiry ──▶ Registered Tutor ─┐
                                     ├─▶ Assignment ──▶ Running Class ──▶ Attendance ──▶ Payroll/Fees
Parent Enquiry ──▶ Registered Parent ┘
```

A **Super Admin** oversees multiple **Branches**. Each branch is staffed by an
**Office Assistant** ("branch" login) who runs the enquiry → registration → assignment
pipeline, tracks attendance, and manages fees/payroll/expenses for that branch.
**Tutors** and **Parents** get restricted logins scoped to their own data. **Students**
get an additional lightweight, read-only login (an addition beyond the source spec —
see `docs/DECISIONS.md`) scoped to their own academic data only (no fees/payment visibility).

## 2. Roles

| Role | Scope | Provisioning |
|---|---|---|
| `SUPER_ADMIN` | All branches | Seeded / created by another super admin |
| `BRANCH_ADMIN` (office assistant) | Own branch only | Created by Super Admin |
| `TUTOR` | Own profile + own assigned students | Created by Branch Admin on registration |
| `PARENT` | Own profile + own children | Created by Branch Admin on registration |
| `STUDENT` | Own academic data only (read-only) | Auto-provisioned alongside parent/child record |

All authorization is **branch-scoped** except for `SUPER_ADMIN`. Every domain row
carries a `branchId`; the authorization layer injects a branch filter on every query
for non-super-admin roles (belt-and-suspenders against IDOR, see `docs/SECURITY.md`).

## 3. High-level architecture

```
┌─────────────────────┐        HTTPS/JSON        ┌───────────────────────────┐
│   apps/web (React)  │ ────────────────────────▶ │   apps/api (Node/Express) │
│  Vite + TS + Router  │ ◀──────────────────────── │  Controllers → Services   │
└─────────────────────┘        Access token in     │  → Repositories → Prisma  │
        │  httpOnly refresh    Authorization header └──────────┬────────────────┘
        │  cookie (see AUTH)                                   │
        ▼                                                      ▼
  Browser storage:                                    ┌─────────────────┐
  - access token in memory only                        │   PostgreSQL     │
  - no secrets in localStorage                          └─────────────────┘
                                                                │
                                                     ┌──────────┴───────────┐
                                                     │ Object storage        │
                                                     │ (KYC docs, materials)  │
                                                     │ local disk (dev) /     │
                                                     │ S3-compatible (prod)   │
                                                     └────────────────────────┘
```

### Backend layering (per module, e.g. `modules/enquiries`)

```
route.ts        → wires HTTP verbs+paths to controller, attaches middleware
controller.ts   → parses/validates request (zod), calls service, shapes HTTP response
service.ts      → business logic, orchestration, transactions — NO express types here
repository.ts   → Prisma queries only — NO business logic here
dto.ts          → zod schemas + inferred types for request/response contracts
```

This keeps business rules out of route definitions and out of UI components (a
hard requirement from the brief), and makes services unit-testable without an HTTP
layer.

### Cross-cutting backend infra

- `config/` — typed, validated env config (zod-parsed at boot; app refuses to start
  on missing/invalid config — no silent defaults for secrets).
- `middleware/` — `authenticate`, `authorize(roles)`, `requireBranchScope`,
  `validate(schema)`, `rateLimit`, `errorHandler`, `auditLog`.
- `common/errors` — typed `AppError` hierarchy (`NotFoundError`, `ForbiddenError`,
  `ValidationError`, `ConflictError`) mapped centrally to HTTP status + consistent
  JSON error shape.
- `common/logger` — structured (pino) logger; request IDs; **never logs
  passwords, tokens, or full KYC document contents**.

### Frontend architecture

- **Vite + React + TypeScript**, file-based feature folders (`features/enquiries`,
  `features/attendance`, …), not one giant `pages/` dump.
- **Routing**: role-aware route trees — each role has its own layout/shell and
  navigation; a shared `ProtectedRoute` component checks auth + role + (where
  relevant) resource ownership before rendering.
- **State/data**: TanStack Query for server state (caching, retries, invalidation)
  + small local UI state (Zustand) for things like the active-child switcher for
  parents. No business logic in components — data-fetching hooks live in
  `features/*/api.ts`, calculations/formatting in `features/*/utils.ts`.
- **Design system**: `components/ui` — a small local primitive set (Button, Card,
  Table, Modal, Dialog, Toast, FormField, EmptyState, Skeleton, StatCard, Badge)
  built once, reused everywhere, themed via CSS variables (light/dark-ready,
  though MVP ships light-first).
- **Forms**: react-hook-form + zod resolver, sharing the *same* zod schemas the
  backend uses for validation where practical (single source of truth for shape,
  duplicated for the trust boundary — client validation is UX only, server
  validation is the real gate).

## 4. Why PostgreSQL + Prisma

Confirmed with you: relational integrity matters here (an Assignment must
reference a real Tutor and a real Student; a Payment must reconcile against
Attendance; reports aggregate across Attendance/Assignment/Fee tables). Prisma
gives typed queries, migrations, and transactions for the money-and-attendance
calculations that must never drift.

## 5. Authentication (see `docs/SECURITY.md` for full detail)

- Password auth for all roles: bcrypt-hashed passwords, short-lived JWT **access**
  token (returned in response body, held in memory on the client) + long-lived
  **refresh** token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie.
- Google Sign-In (OIDC) additionally available for `SUPER_ADMIN` and
  `BRANCH_ADMIN` only (per your decision) — authorization-code flow verified
  server-side via `openid-client` (issuer discovery, signature, `aud`, `iss`,
  `exp` all checked — never trust unverified claims).
- Forced password reset on first login for admin-issued accounts (tutor/parent/
  student) — no permanent plaintext-issued passwords.
- Every tutor login requires re-acknowledging institute rules & regulations
  (a PDF-specified compliance gate) — stored as a timestamped acknowledgment
  record, not just a UI checkbox, so it's auditable.

## 6. Folder structure

```
coaching-app/
├─ apps/
│  ├─ api/                     # Node/Express/TypeScript backend
│  │  ├─ src/
│  │  │  ├─ config/            # env schema + loader
│  │  │  ├─ middleware/
│  │  │  ├─ common/{errors,logger,utils}
│  │  │  ├─ modules/           # one folder per bounded context
│  │  │  │  ├─ auth/
│  │  │  │  ├─ branches/
│  │  │  │  ├─ enquiries/
│  │  │  │  ├─ registration/
│  │  │  │  ├─ assignments/
│  │  │  │  ├─ attendance/
│  │  │  │  ├─ fees/
│  │  │  │  ├─ payroll/
│  │  │  │  ├─ expenses/
│  │  │  │  ├─ reports/
│  │  │  │  ├─ announcements/
│  │  │  │  └─ users/
│  │  │  ├─ jobs/               # scheduled tasks (e.g. nightly attendance rollups)
│  │  │  └─ app.ts / server.ts
│  │  └─ prisma/schema.prisma
│  └─ web/                     # React/Vite/TypeScript frontend
│     └─ src/{app,pages,features,components,hooks,lib,styles,types}
├─ docs/                       # this file + DATA-MODEL, SECURITY, API, DECISIONS
└─ package.json                # npm workspaces root
```

## 7. Deployment shape (recommended, not yet provisioned)

Dockerized `api` + `web` (static build behind nginx or a CDN) + managed
PostgreSQL + S3-compatible bucket for KYC/materials. All secrets via environment
variables / a secrets manager — never committed. `docs/` will get a
`DEPLOYMENT.md` once we reach that phase.

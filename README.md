# SR Home Tutors — Coaching/Home-Tutoring Agency Management Platform

Multi-branch home-tutoring agency management system (see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture,
[docs/DATA-MODEL.md](docs/DATA-MODEL.md) for the schema, and
[docs/DECISIONS.md](docs/DECISIONS.md) for assumptions/decisions made along
the way).

## Status

🚧 Foundation phase. Built so far: architecture, data model, Prisma schema,
backend infra (config, logging, error handling), full authentication
(password + Google OIDC for admin/branch roles, remember-me, forced
first-login reset) with RBAC middleware, a redesigned production-quality
login experience, the Branch management module, and Super Admin/Branch
Admin dashboards. Tutor/Parent/Student dashboards exist as honest
"under construction" shells behind full role-based auth. Remaining business
modules (enquiries, assignments, attendance, fees, payroll, reports) are
next.

## Prerequisites

- Node.js >= 20
- Docker (for local Postgres) — or your own Postgres 14+ instance

## Setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Start local Postgres
docker compose up -d

# 3. Configure the backend
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — at minimum set real JWT_ACCESS_SECRET,
# JWT_REFRESH_SECRET, COOKIE_SECRET before doing anything beyond local dev
# (openssl rand -base64 48 is a good way to generate these)

# 4. Create the database schema
npm run prisma:migrate --workspace=apps/api -- --name init

# 5. Seed the Super Admin login + demo accounts for every role
npm run seed --workspace=apps/api
# Prints credentials to the terminal — see "Demo accounts" below for the
# ones you'll actually use day to day.

# 6. Run the backend
npm run dev:api
# API on http://localhost:4000, health check at /health

# 7. Run the frontend
npm run dev:web
# App on http://localhost:5173
```

## Demo accounts

`npm run seed` creates one login per role, all sharing one password, so you
can review the full UI without hand-creating any data:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@test.com` | value of `TEST_USER_PASSWORD`, or `DevTest@12345` if unset |
| Branch Office | `branch@test.com` | same |
| Tutor | `tutor@test.com` | same |
| Parent | `parent@test.com` | same |
| Student | `student@test.com` | same |

These are refused in production unless you explicitly set
`ALLOW_TEST_SEED=true` — never do that against a real database. The seed
also creates a **separate**, real bootstrap Super Admin
(`SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`, defaults to a random
one-time password printed to the terminal) — that's the account meant for
actual production use; `admin@test.com` is only for reviewing the UI.

## Environment variables

See [apps/api/.env.example](apps/api/.env.example) for the full list with
explanations. The server refuses to start if required variables are missing
or invalid — see `apps/api/src/config/env.ts`.

## Project structure

```
apps/
  api/    Node.js + Express + TypeScript + Prisma backend
  web/    React + Vite + TypeScript frontend
docs/     Architecture, data model, decisions, (security/API docs to follow)
```

## Google Sign-In setup (Super Admin / Branch Admin only)

1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application).
2. Add `http://localhost:4000/api/auth/google/callback` as an authorized
   redirect URI (and your production URL when deploying).
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in
   `apps/api/.env`.
4. Google sign-in only ever links to an **existing** Super Admin/Branch Admin
   account by verified email — it never auto-creates accounts. To test it,
   the Google account's email must match `admin@test.com`/`branch@test.com`
   (or a real admin account's email) exactly, and Google must report
   `email_verified: true`. See `apps/api/src/modules/auth/google.service.ts`
   for why it's built this way. Without this configured, the "Continue with
   Google" button on the login page will show a clear error rather than
   silently failing.

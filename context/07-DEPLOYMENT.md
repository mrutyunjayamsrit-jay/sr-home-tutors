# Deployment

Two phases, worked out in sequence for the first customer — reusable as-is
for the next one (new hosting accounts/secrets per customer, same recipe).

## Phase 1 — no customers yet (current): genuinely free, no expiry clock

**Oracle Cloud Always Free (Mumbai/Hyderabad) + Supabase (free/cheap
Postgres + S3-compatible Storage) + Cloudflare Pages.** Unlike AWS's newer
account model (a 6-month, $100–200 credit that starts billing regardless of
customer count once it runs out), none of these three have an expiring
trial clock — genuinely $0/month for as long as there are no paying
customers.

**This is built and validated** — see [`deploy/README.md`](../deploy/README.md)
for exactly what runs where, and
[`09-DEPLOYMENT-RUNBOOK.md`](09-DEPLOYMENT-RUNBOOK.md) for the exact
click-through steps (account creation, VM provisioning, DNS, Supabase
project setup, Cloudflare Pages config) — those parts need your own
identity/credentials, so they're not something that could be pre-built.

Two real bugs were found and fixed while validating the actual Docker
build (not just `tsc --noEmit`, which doesn't catch either of these):
1. `tsc`'s compiled output never rewrote the `@/` path aliases used
   throughout the codebase — `node dist/server.js` couldn't even start.
   Fixed by adding `tsc-alias` as a post-build step.
2. Prisma's default Alpine (musl) engine binary didn't match the OpenSSL
   version `node:20-alpine` actually ships — worked at build time, failed
   at container runtime. Fixed by moving the Docker image to Debian-slim
   (`node:20-slim`) instead, with an explicit `debian-openssl-3.0.x`
   binary target in `schema.prisma`.

Also required a genuine code change for this specific split-origin
architecture (frontend on Cloudflare Pages, API on the Oracle VM's own
domain): the refresh-token cookie was `SameSite=Strict`, which a browser
will never send back on a cross-site request — "stay logged in" would have
silently broken the moment these were on different domains. Fixed with a
new `COOKIE_CROSS_SITE` env flag (see `token.service.ts`) — off (`Strict`)
for same-origin deployments, on (`None; Secure`) for this one.

**File storage is now genuinely wired up** — `documents.service.ts`
supports both `local` (dev) and `s3` (production) via `STORAGE_PROVIDER`,
using `@aws-sdk/client-s3` against any S3-compatible endpoint (validated
locally with a full upload → list → download → delete cycle). This used to
be a scaffolded-but-unimplemented gap; it no longer is.

## Phase 2 — once there are real customers: paid, still India-local

When it's time to move off the free tier (more traffic than Oracle's free
ARM allowance comfortably handles, or you want a stronger SLA than a
self-managed VM), the two options worked out earlier, still relevant:

| Layer | Choice | Why |
|---|---|---|
| API compute | **Fly.io, Mumbai region (`bom`)** | Real India datacenter, runs the same Docker image built for Phase 1 as a normal long-lived process — no rewrite needed, just redeploy the same container. |
| Database | **Supabase, Mumbai**, paid tier | Same provider as Phase 1 — just upgrade the plan for point-in-time recovery/higher limits, no migration needed. |
| File storage | Same Supabase Storage bucket, or move to Cloudflare R2 | Both S3-compatible; `documents.service.ts` doesn't care which, just update the `S3_*` env vars. |
| Frontend | Same Cloudflare Pages | No change needed at all. |

Rough cost: **$25–35/month** all-in once paid tiers are needed.

**Turnkey alternative** if you'd rather have less to personally operate:
**DigitalOcean App Platform + Managed Database, both in Bangalore (BLR1)**
— costs more (~$40–50/month once sized) but there's less that can go wrong
operationally for a small team.

Moving between any of these is low-risk specifically because the app was
kept platform-agnostic on purpose: a plain Dockerized Node service + a
standard Postgres database + a static frontend build, no
provider-proprietary APIs anywhere in the code.

## Environment variables (production checklist)

From `apps/api/.env.example` / `src/config/env.ts` — the app **refuses to
boot** (`process.exit(1)`) if a required one is missing or still set to its
obviously-fake dev placeholder, so there's a built-in guard against
half-configuring this by accident.

**Must set, no fallback in production:**
- `NODE_ENV=production`
- `APP_URL`, `WEB_URL` — real production URLs (also drives CORS).
- `DATABASE_URL` — the Supabase (or chosen) Postgres connection string.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` — each a
  **separate**, real random value, `openssl rand -base64 48` each. Never
  reuse one across environments/customers. Rotating any of these logs out
  every currently-signed-in user — expected, not a bug.

**Set if using the corresponding feature:**
- `COOKIE_CROSS_SITE=true` — required whenever the frontend and API are on
  different origins (Phase 1's whole setup). Leave `false` only if you
  later serve both from the same origin.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — only
  if Google Sign-In is wanted for Super Admin/Branch Admin; update the
  redirect URI registered in Google Cloud Console to the real production
  domain.
- `STORAGE_PROVIDER=s3` + `S3_*` — required in production (see above).
- `SMTP_*` — outbound email; update `SMTP_FROM` per `06-REBRANDING-
  CHECKLIST.md`.

**Bootstrap-only (consumed once by `npm run seed`, never by the running
server):**
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — the real first login. Set
  a real email; if password is left unset, a one-time random password is
  generated and printed to the deploy log — capture it immediately.
- `ALLOW_TEST_SEED` — leave `false`/unset in production, always. The demo
  accounts (`admin@test.com` etc., all sharing one well-known password) are
  a QA convenience, never something to expose on a real customer's data.

## Production-readiness checklist (do all of these, regardless of platform)

- [x] File uploads migrated to S3-compatible storage — done, see above.
- [ ] Database backups configured, **and a real test restore actually
  performed once** — "backups are on" is not the same as "backups work."
  (Supabase's free tier has limited/no PITR — a real consideration for
  when this matters enough to move to a paid tier.)
- [ ] All three JWT/cookie secrets set to fresh random values, never the
  dev placeholder.
- [x] `COOKIE_CROSS_SITE` set correctly for a split-origin deployment —
  done, see above.
- [ ] Custom domain + TLS (free on every platform recommended above).
- [ ] Google OAuth redirect URI updated to the real production domain, if
  using that login path.
- [ ] `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` set to a real account, and
  the printed one-time password (if generated) captured and the login
  actually tested once, then changed.
- [ ] `ALLOW_TEST_SEED` left off; demo accounts not seeded against real
  customer data.
- [ ] Basic error monitoring wired (Sentry's free tier is enough to start).
- [ ] Basic uptime monitoring wired (UptimeRobot free tier is enough to
  start).
- [ ] `prisma migrate deploy` run as the release step on every deploy (not
  `migrate dev` — that's the interactive one, see `02-...md`). Already
  wired into `deploy/deploy.sh`.
- [ ] `Settings` page filled in for the new customer (org name, support
  contact, tutor rules text) — the part of rebranding that needs zero code
  change, see `06-REBRANDING-CHECKLIST.md`.

# Deploy folder

Everything here targets the **Oracle Cloud (Always Free) + Supabase +
Cloudflare Pages** stack. For the full click-through walkthrough (creating
the accounts, the VM, the Supabase project, the Pages site — the parts only
you can do, since they need your own identity/credentials), see
[`context/09-DEPLOYMENT-RUNBOOK.md`](../context/09-DEPLOYMENT-RUNBOOK.md).
This file is just what each piece here does.

| File | Purpose |
|---|---|
| `../Dockerfile` (repo root) | Builds `apps/api` into a runnable image. Debian-slim based — see its own comments for why (Alpine hit a real Prisma/OpenSSL engine mismatch, validated and fixed during setup). |
| `../.dockerignore` (repo root) | Keeps the build context lean. |
| `docker-compose.prod.yml` | Runs the API container + a Caddy reverse proxy on the Oracle VM. No database container — Postgres is Supabase (external, managed). |
| `Caddyfile` | Reverse proxy + **automatic HTTPS** (Let's Encrypt) in front of the API. Edit the domain line before first run. |
| `.env.production.example` | Copy to `.env.production` **on the VM** (never commit the filled-in version) and fill in real values — Supabase connection string, Supabase Storage S3 credentials, JWT/cookie secrets, your domains. |
| `deploy.sh` | Run on the VM after SSHing in: `git pull` → rebuild → restart → `prisma migrate deploy` → tail logs. The whole redeploy process, one command. |

## Quick reference (once everything in the runbook is provisioned)

```bash
# On the Oracle VM, inside the cloned repo:
cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production        # fill in real values
./deploy/deploy.sh                 # builds, starts, migrates, tails logs
```

Every subsequent deploy is just `git pull && ./deploy/deploy.sh` again (or
just re-run `./deploy/deploy.sh`, which pulls itself).

## What was actually validated before this was written down

- `docker build` on this exact Dockerfile — succeeds.
- The compiled output actually **boots** (`node dist/server.js`) and
  answers `/health` — this had never actually been run in this project
  before; `tsc --noEmit` alone doesn't catch it. Fixed a real bug in the
  process: `tsc`'s output doesn't rewrite the `@/` path aliases used
  throughout the codebase into real relative paths, so the compiled app
  couldn't even start (`Cannot find module '@/config/env'`) until
  `tsc-alias` was added as a post-build step.
- The containerized app connects to Postgres and serves a real login
  end-to-end (tested against a local Postgres reachable from the
  container) — this surfaced a second real bug: Prisma's default engine
  binary for Alpine (musl) didn't match the OpenSSL version Alpine's
  node:20-alpine image actually ships, causing a runtime-only failure that
  a successful `docker build` doesn't reveal. Fixed by moving the whole
  image to Debian-slim (`node:20-slim`) instead of chasing Alpine's
  musl/OpenSSL variant matching.
- **Not validated**: an actual Supabase connection, actual Supabase Storage
  upload, or the Oracle VM itself — those need real accounts that only you
  can create. Test the login + a document upload for real the first time
  you deploy, before considering this "done."

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
| `docker-compose.prod.yml` | Runs the API container on the Oracle VM, listening on port 80 directly. No database container — Postgres is Supabase (external, managed). No local reverse proxy/TLS either — see note below. |
| `.env.production.example` | Copy to `.env.production` **on the VM** (never commit the filled-in version) and fill in real values — Supabase connection string, Supabase Storage S3 credentials, JWT/cookie secrets, your domains. |

**Why no Caddy/TLS on the VM**: this runs on the Always Free **AMD micro**
shape (1GB RAM) — the Ampere ARM shape's capacity was exhausted in both
India regions at setup time, so the much-less-contested AMD shape was used
instead (see `09-DEPLOYMENT-RUNBOOK.md`). At 1GB, running a second process
just for TLS termination isn't worth the memory. Instead, **Cloudflare
terminates HTTPS at its edge** (DNS record set to "Proxied," SSL/TLS mode
"Flexible") and talks plain HTTP to the VM on port 80. If you later move to
a bigger instance and want the VM to hold its own certificate instead,
reintroduce a Caddy service in front of `api` and switch Cloudflare to
"Full" mode.
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

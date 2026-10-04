# Deployment Runbook — Oracle Cloud Free + Supabase + Cloudflare Pages

This is the concrete, step-by-step version of the plan in
[07-DEPLOYMENT.md](07-DEPLOYMENT.md), specifically for the "no customers
yet, keep it genuinely free" phase. The code-side work (Dockerfile,
docker-compose, the S3 storage wiring, the cross-origin cookie fix) is
already done and validated — see [`deploy/README.md`](../deploy/README.md)
for exactly what was checked. **Everything below this line needs your own
account/identity** — sign-ups, region/instance choices, and clicking
through consoles that no one else can do on your behalf. Cloud consoles
change their exact menu wording over time; treat each step as "find the
setting that does this," not a pixel-perfect map.

## Part 1 — Oracle Cloud: the compute VM

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com) for an **Always
   Free** account. Oracle requires a credit card for identity verification
   even for the free tier — you will not be charged as long as you stay
   within Always Free limits, but know this going in.
2. Once in the console, create a **Compute Instance**:
   - **Region**: pick **Mumbai** or **Hyderabad** (whichever shows capacity
     — Always Free ARM instances have had availability issues in some
     regions; if one is full, try the other, or retry the same region
     later).
   - **Image**: Ubuntu (latest LTS) is the simplest choice.
   - **Shape**: switch to **Ampere (ARM)**, shape `VM.Standard.A1.Flex`.
     Always Free covers up to 4 OCPUs + 24GB RAM total — use all of it on
     this one instance (simplest) unless you have a specific reason to
     split it into more than one VM.
   - **Networking**: let it create a new VCN if you don't have one; make
     sure "Assign a public IPv4 address" is on.
   - **SSH keys**: let Oracle generate a key pair and **download the
     private key immediately** — it's shown once.
3. Once running, note the instance's **public IP address**.
4. Open the firewall for HTTP/HTTPS — Oracle has **two** layers to update,
   both required:
   - The VCN's **Security List** (or a Network Security Group if you used
     one): add ingress rules for TCP 80 and TCP 443 from `0.0.0.0/0`.
   - The instance's own OS firewall (Ubuntu's `iptables`/`ufw`) — Oracle's
     Ubuntu images ship with restrictive default `iptables` rules even
     though the cloud-level Security List allows it. SSH in and run:
     ```bash
     sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
     sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
     sudo netfilter-persistent save   # or: sudo apt install iptables-persistent
     ```
5. SSH in (`ssh -i <downloaded-key> ubuntu@<public-ip>`) and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER
   # log out and back in for the group change to take effect
   ```
6. Clone your repo onto the VM (a public repo needs no auth; a private one
   needs a deploy key or a personal access token):
   ```bash
   git clone <your-repo-url> sr-home-tutors
   cd sr-home-tutors
   ```

## Part 2 — DNS

Point a subdomain (e.g. `api.yourdomain.com`) at the Oracle VM's public IP
with an **A record**, wherever your domain's DNS is managed. Caddy (already
configured in `deploy/Caddyfile`) needs this to resolve *before* it can
issue a TLS certificate — do this before the first `docker compose up`.
Don't have a domain yet? You can use the VM's bare IP over plain HTTP
temporarily to test connectivity, but you'll need a real domain before
`COOKIE_CROSS_SITE`'s `Secure` cookie requirement and Caddy's automatic
HTTPS can actually work — get one (any registrar) before going further.

## Part 3 — Supabase: database + file storage

1. Sign up at [supabase.com](https://supabase.com), create a new project.
   - **Region**: choose Mumbai (South Asia) if it's offered in the region
     list — keeps the database physically close to the Oracle VM and to
     your India-based users.
   - Set a strong database password when prompted — you'll need it in the
     connection string next.
2. **Database connection string**: Project Settings → Database →
   Connection string → **URI**, using the **direct connection** (port
   `5432`), not the pooled/pgbouncer one (port `6543`) — see
   `deploy/.env.production.example`'s comment on why. Paste it into
   `DATABASE_URL`.
3. **Storage bucket**: Storage → Create a new bucket (e.g. `documents`).
   Private is fine — the app always serves downloads through its own
   authenticated `/documents/:id/download` endpoint, never a direct public
   bucket URL.
4. **S3-compatible credentials**: Project Settings → Storage → look for
   the **S3 Connection** section (endpoint URL, region, and a button to
   generate access key/secret). Copy all four into
   `S3_ENDPOINT`/`S3_REGION`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` —
   `S3_BUCKET` is the bucket name you picked above.

## Part 4 — Configure and deploy the API

On the Oracle VM, inside the cloned repo:

```bash
cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production
```

Fill in: `APP_URL` (your `api.` subdomain), `WEB_URL` (set after Part 5,
come back to this), `DATABASE_URL` (Part 3), three separate
`openssl rand -base64 48` secrets for `JWT_ACCESS_SECRET`/
`JWT_REFRESH_SECRET`/`COOKIE_SECRET`, `COOKIE_CROSS_SITE=true` (already set
in the example — leave it), the `S3_*` values (Part 3), and
`SUPER_ADMIN_EMAIL` (a real email you control).

Also edit `deploy/Caddyfile`, replacing `api.yourdomain.com` with your real
subdomain.

Then:

```bash
./deploy/deploy.sh
```

This builds the image, starts the API + Caddy containers, and runs
`prisma migrate deploy` to create the schema. Watch the log tail for
"API listening" and no errors. Caddy will attempt to get a Let's Encrypt
certificate automatically on first request to your domain over HTTPS —
give it a minute after DNS propagates.

**Seed the real Super Admin login** (one-time): the runtime image only
contains the compiled `dist/` output, not `tsx` or the `prisma/seed.ts`
source — it's not meant to run inside the production container. The
simplest reliable way to run it once against production is from your
**own machine**, pointed at the production `DATABASE_URL`: 

```bash
# On your own machine, apps/api/, with a .env pointed at the SAME
# DATABASE_URL as production (copy the relevant values from
# deploy/.env.production temporarily — never commit them):
SUPER_ADMIN_EMAIL=admin@yourdomain.com \
SUPER_ADMIN_PASSWORD=<a-real-strong-password> \
DATABASE_URL="<the same Supabase URI>" \
npx tsx prisma/seed.ts
```

This creates the real bootstrap Super Admin against the production
database over the internet — capture the printed credentials (or better,
set `SUPER_ADMIN_PASSWORD` yourself so nothing is only-ever-printed-once).
Do **not** leave `ALLOW_TEST_SEED=true` — the demo accounts must never be
seeded against real customer data.

## Part 5 — Cloudflare Pages: the frontend

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com), go to
   **Workers & Pages** → **Create** → **Pages** → connect your Git
   provider and pick this repo.
2. Build settings:
   - **Build command**: `npm run build --workspace=apps/web` (or `cd
     apps/web && npm install && npm run build` if Cloudflare's build
     doesn't run from the repo root the way you expect — check the actual
     build log the first time).
   - **Build output directory**: `apps/web/dist`.
   - **Root directory**: leave as the repo root (needed for the npm
     workspaces install to resolve correctly).
3. **Environment variable**: add `VITE_API_URL` = `https://api.yourdomain.com/api`
   (your Part 1–4 domain, with `/api` on the end — matches
   `apps/web/.env.example`'s comment).
4. Deploy. Cloudflare gives you a `*.pages.dev` URL immediately; add a
   custom domain later if you want one (Pages → Custom domains).
5. **Go back to `deploy/.env.production` on the Oracle VM** and set
   `WEB_URL` to whatever this Cloudflare Pages URL actually is (the
   `*.pages.dev` one, or your custom domain if you attached one), then
   re-run `./deploy/deploy.sh` so CORS actually allows it.

## Part 6 — Smoke test, for real

Don't consider this done until you've actually done all of these, not just
assumed they work:

- [ ] Load the Cloudflare Pages URL, log in as the real Super Admin
      (Part 4's seeded account).
- [ ] Confirm you're still logged in after a hard refresh (this is the
      thing `COOKIE_CROSS_SITE` fixes — if it silently logs you out on
      refresh, that setting isn't taking effect).
- [ ] Upload a document somewhere (a KYC doc, a payment proof, a study
      material) and confirm it appears in Supabase's Storage bucket, not
      just in the app's UI.
- [ ] Redeploy (`./deploy/deploy.sh` again, even with no changes) and
      confirm that uploaded document is still downloadable afterward —
      this is the actual proof the ephemeral-local-disk problem is fixed.
- [ ] Set the org name/support contact in **Settings** (see
      `06-REBRANDING-CHECKLIST.md`) for this customer.

## When you're ready to move off this (once there are real customers)

Nothing here locks you in. The API is a plain Docker image — redeploy it
anywhere that runs containers. The database is standard Postgres —
`pg_dump`/`pg_restore` (or Supabase's own migration/export tooling) moves
it anywhere. The frontend is a static build — deploy it anywhere that
serves static files. See `07-DEPLOYMENT.md` for the paid-tier options this
was compared against.

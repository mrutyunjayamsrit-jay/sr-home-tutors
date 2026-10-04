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
   within Always Free limits, but know this going in. **Pick Mumbai or
   Hyderabad as your Home Region carefully at signup** — it cannot be
   changed later without a new account.
2. Once in the console, create a **Compute Instance**:
   - **Image**: Ubuntu (latest LTS) is the simplest choice.
   - **Shape**: try **Ampere (ARM)** `VM.Standard.A1.Flex` first (4 OCPU/24GB,
     the bigger Always Free allowance) — but its capacity is heavily
     contested in Indian regions and creation may fail with "Out of
     capacity." If it does (repeatedly), switch to **AMD**
     `VM.Standard.E2.1.Micro` (1 OCPU/1GB) instead — a separate, far less
     contested capacity pool that provisions instantly. This runbook
     assumes you may end up on the AMD shape; see the swap-file step below,
     which matters a lot more at 1GB than at 24GB.
   - **Networking**: when choosing the subnet, **explicitly pick the one
     labeled "Public Subnet"** (not "Private Subnet") and confirm "Assign a
     public IPv4 address" is checked — a private subnet never gets a public
     IP no matter what else is set. If you still end up with no public IP
     after creation, fix it without recreating: instance → Resources →
     Attached VNICs → click it → click the private IP entry → Edit → assign
     an **Ephemeral Public IP**.
   - **SSH keys**: let Oracle generate a key pair and **download the
     private key immediately** — it's shown once.
3. Once running, note the instance's **public IP address**.
4. Open the firewall for HTTP — Oracle has **two** layers to update, both
   required (we only need port 80 with this setup; see Part 2 for why 443
   isn't needed on the VM itself):
   - The VCN's **Security List**: add an ingress rule for TCP **80** from
     `0.0.0.0/0` (port 22 for SSH is usually already present by default —
     confirm it is).
   - The instance's own OS firewall — Oracle's Ubuntu images ship
     restrictive default `iptables` rules even though the Security List
     allows it. SSH in and run:
     ```bash
     sudo apt update
     sudo apt install -y iptables-persistent   # prompts to save current rules — say yes
     sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
     sudo netfilter-persistent save
     ```
5. If you're on the 1GB AMD shape, add a swap file — real memory headroom
   matters a lot more here than on the ARM shape:
   ```bash
   sudo fallocate -l 1G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   free -h   # confirm swap shows up
   ```
6. Install Docker. The official convenience script
   (`curl -fsSL https://get.docker.com | sudo sh`) can fail on some
   Ubuntu/arch combinations trying to install an unrelated optional plugin
   (`docker-model-plugin`) — if that happens, install from Ubuntu's own
   repos instead, which is fully sufficient here:
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER
   exit   # log back in for the group change to take effect
   ```
   Confirm with `docker ps` (should run with no permission error) after
   logging back in.
7. Clone your repo onto the VM (a public repo needs no auth; a private one
   needs a deploy key or a personal access token):
   ```bash
   git clone <your-repo-url> sr-home-tutors
   cd sr-home-tutors
   ```

## Part 2 — DNS

Point a subdomain (e.g. `api.yourdomain.com`) at the Oracle VM's public IP
with an **A record**, wherever your domain's DNS is managed.

**If your DNS is on Cloudflare** (which it will be if you're using
Cloudflare Pages too) and you're on the 1GB AMD shape without a local
reverse proxy (see `deploy/README.md`'s note on why there's no Caddy in
this setup): set this record to **Proxied** (orange cloud), not "DNS
only." Then in Cloudflare's **SSL/TLS** settings for the domain, set the
encryption mode to **Flexible** — Cloudflare then terminates HTTPS at its
own edge and talks plain HTTP to the VM on port 80, so the VM itself never
needs to manage a certificate at all. This is *different* from the usual
Cloudflare advice for a server that terminates its own TLS (which would
want "DNS only" + "Full") — this setup deliberately doesn't do that, to
save memory on a 1GB instance.

Don't have a domain yet? You can use the VM's bare IP temporarily to test
connectivity, but you'll need a real domain before `COOKIE_CROSS_SITE`'s
`Secure` cookie requirement is satisfiable (it needs a real HTTPS origin
somewhere in the chain, which Cloudflare's edge provides once the domain
is proxied through it) — get one (any registrar) before going further.

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

Fill in: `APP_URL` (your `api.` subdomain, `https://` — this is the
*public-facing* URL as seen by browsers/Google OAuth, even though the VM
itself only serves plain HTTP; Cloudflare is what makes it https, see Part
2), `WEB_URL` (set after Part 5, come back to this), `DATABASE_URL` (Part
3), three separate `openssl rand -base64 48` secrets for
`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`COOKIE_SECRET`,
`COOKIE_CROSS_SITE=true` (already set in the example — leave it), the
`S3_*` values (Part 3), and `SUPER_ADMIN_EMAIL` (a real email you control).

Then:

```bash
./deploy/deploy.sh
```

This builds the image, starts the API container listening on port 80, and
runs `prisma migrate deploy` to create the schema. Watch the log tail for
"API listening" and no errors.

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

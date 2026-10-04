# Context Pack — how to use this folder

This folder is a **reusable spec of the whole application**, written so a
fresh Claude session (no prior conversation history) can either (a) work on
*this* codebase competently, or (b) stand up a **white-labeled copy for a new
customer** by editing names/branding/business numbers and re-running the same
build process against a clean database.

It exists because `docs/` (ARCHITECTURE.md, DATA-MODEL.md, DECISIONS.md,
API.md) was written at the very start of the project and now describes a
"foundation phase" that no longer matches reality — every module it lists as
"next" has since been built, plus a dozen more that don't appear there at
all. This folder supersedes `docs/` as the accurate reference; `docs/` is
kept for its still-useful historical decision log (see 08) but should not be
trusted for current architecture/feature state.

## Read order

1. **[01-PRODUCT-OVERVIEW.md](01-PRODUCT-OVERVIEW.md)** — what this product
   is, who uses it, the core business funnel. Start here.
2. **[02-ARCHITECTURE-AND-CONVENTIONS.md](02-ARCHITECTURE-AND-CONVENTIONS.md)**
   — tech stack, folder layout, and the *house style* this codebase has
   consistently followed across every feature built so far. Read this before
   writing any code, whether on this app or a clone — deviating from these
   conventions is how a codebase this size stops being maintainable by a
   single AI-assisted developer.
3. **[03-DATA-MODEL.md](03-DATA-MODEL.md)** — every Prisma model/enum, grouped
   by domain, with the non-obvious relationships explained.
4. **[04-FEATURES-BY-ROLE.md](04-FEATURES-BY-ROLE.md)** — the full feature
   inventory, organized by who sees what. This is the closest thing to a
   product spec; use it to scope "what does customer #2 actually need" vs.
   "what's specific to customer #1."
5. **[05-BUSINESS-RULES.md](05-BUSINESS-RULES.md)** — the specific numbers and
   logic decisions buried in code (geofence radius, checkout gap, short-class
   threshold, fee-matching logic, etc.) that are easy to lose track of and
   easy to accidentally regress if re-implemented from memory.
6. **[06-REBRANDING-CHECKLIST.md](06-REBRANDING-CHECKLIST.md)** — **the file
   you actually asked for**: every place the current brand ("SR Home
   Tutors") is hardcoded, so a new customer's name/contact/rules text can be
   swapped in completely, in one pass, without missing a spot.
7. **[07-DEPLOYMENT.md](07-DEPLOYMENT.md)** — the production deployment plan
   (hosting choice, region, storage, secrets, checklist) worked out for the
   first customer — reusable as-is for the next one, new project = new set
   of hosting accounts/secrets, same recipe.
8. **[09-DEPLOYMENT-RUNBOOK.md](09-DEPLOYMENT-RUNBOOK.md)** — the actual
   click-through steps for 07's Phase 1 stack (Oracle Cloud + Supabase +
   Cloudflare Pages) — account creation, VM provisioning, DNS, env vars,
   the works. Pair this with [`deploy/`](../deploy/) at the repo root
   (Dockerfile, docker-compose, Caddyfile, deploy script), which is the
   code-side half of the same setup and is already built and validated.
9. **[08-KNOWN-GAPS-AND-TODOS.md](08-KNOWN-GAPS-AND-TODOS.md)** — things
   that are scaffolded but not finished (e.g. S3 storage), known limitations,
   and a couple of things `docs/DECISIONS.md` claims that are no longer true
   in the actual code (worth reading once so you don't repeat an assumption
   the code has since drifted away from).

## Using this for a new customer

The intended workflow (per your request) is:

1. Copy this whole repo (or branch it) for the new customer.
2. Update **06-REBRANDING-CHECKLIST.md**'s items — name, contact details,
   rules text, seed data, `.env` values, hosting accounts.
3. Skim **04-FEATURES-BY-ROLE.md** and **05-BUSINESS-RULES.md** with the new
   customer and note anything that genuinely differs for their business
   (different fee structure, different document types required at
   registration, different attendance geofence radius, branch names, etc.)
   — hand those deltas to Claude as the actual task list; everything *not*
   mentioned is assumed to carry over unchanged.
4. Point a new Claude session at this `context/` folder plus the delta list
   and let it work from there — it should not need to re-derive architecture
   or conventions from scratch, only apply the specific changes.
5. Follow **07-DEPLOYMENT.md** against a fresh set of cloud accounts.

Nothing in this folder is executable — it's documentation only. Keep it
updated the same way you'd keep any spec updated: when a future session adds
a real feature or changes a business rule, update the relevant file here
too, the same session, before moving on. A context pack that drifts from the
code is worse than no context pack, because it actively misleads the next
person (or the next Claude) who trusts it.

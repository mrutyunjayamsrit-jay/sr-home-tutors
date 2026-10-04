# Rebranding Checklist — reusing this codebase for a new customer

Every place the current brand ("SR Home Tutors") appears in the codebase,
found by grepping the whole repo for `SR Home Tutors` / `srhometutors` /
`sr-home-tutors` — nothing on this list is guessed. Grouped by whether it
already updates itself at runtime or needs an actual code edit.

## Already dynamic — no code change needed

`OrgSettings` (singleton DB row, editable by Super Admin under **Settings**,
no redeploy required — see 03) already drives:

- The public marketing **HomePage** (`features/public-site/HomePage.tsx`) —
  reads `organizationName` for its heading/tagline/footer copyright line.
- The tutor **rules-acknowledgment text** (`RulesGate.tsx`) — reads
  `tutorRulesText` at login time. (The literal string "SR Home Tutors" that
  shows up grepping `RulesGate.tsx` is only in a *code comment* explaining
  the feature, not the actual displayed text — safe to ignore.)

So for a new customer, **Settings → Organization Name / Support Email /
Support Phone / Tutor Rules Text**, set once after seeding, covers those
surfaces with zero code changes. Everything below this line does NOT read
from `OrgSettings` and needs an actual edit.

## Hardcoded UI text — needs a code edit

| File | What to change |
|---|---|
| `apps/web/src/app/AppShell.tsx` (~line 39) | The logged-in app's header logo text, literally `SR Home Tutors` in JSX (plus a "SR" logo-mark initials span just above it) — shown on every authenticated page for every role. **Highest-visibility item on this list.** |
| `apps/web/src/features/auth/LoginPage.tsx` (~line 60) | `<span className={styles.brandName}>SR Home Tutors</span>` on the login screen. |
| `apps/web/src/features/announcements/AnnouncementsPage.tsx` (~line 28) | Parent-facing announcements page subtitle: `"Updates from SR Home Tutors and your branch office."` |
| `apps/web/index.html` (line 7) | `<title>SR Home Tutors</title>` — the browser tab title. |

**Better long-term fix, worth doing once rather than repeating per
customer**: make `AppShell.tsx` and `LoginPage.tsx` fetch `OrgSettings.
organizationName` the same way `HomePage.tsx` already does (there's likely
already a public/authenticated settings-read hook to reuse — check
`features/settings/api.ts` and `features/public-site/api.ts`), instead of a
JSX literal. That collapses this whole section into the "already dynamic"
one above for every future customer. Flagged in `08-KNOWN-GAPS.md` too.

## Config / internal strings — cosmetic, lower priority

| File | What it is |
|---|---|
| `apps/api/src/modules/auth/token.service.ts` (lines ~20, ~26) | JWT `issuer` claim, literally `"sr-home-tutors-api"`. Never shown to a user; only matters if you ever validate this claim against something external. Fine to leave, or rename for cleanliness. |
| `apps/api/.env.example` and `.env` (line 44) | `SMTP_FROM="SR Home Tutors <no-reply@example.com>"` — the from-name/address on outbound email. **Actually user-visible** (shows up in every email a customer receives) — change this per deployment. |

## Seed data — set per customer, not edited in source

`apps/api/prisma/seed.ts`:

- `SUPER_ADMIN_EMAIL` defaults to `admin@srhometutors.example` if unset —
  always set a real `SUPER_ADMIN_EMAIL` in that customer's `.env`/hosting
  secrets rather than relying on the fallback (the fallback is meant as an
  obviously-fake placeholder, not a real default to ship).
- Demo/test account emails (`admin@test.com`, `branch@test.com`, etc.) are
  fine to leave as-is — they're internal QA accounts, refused in production
  unless `ALLOW_TEST_SEED=true`, and never customer-facing.
- The demo `Branch` created by `seedTestAccounts()` is named `"Test Branch —
  Koramangala"` (code `TEST01`) — purely a QA fixture, not something a real
  customer sees unless you leave test seeding on in production (don't).

## Package/project identity — cosmetic, internal only

`package.json` (root: `"sr-home-tutors"`), `apps/web/package.json`
(`"@sr-home-tutors/web"`), `apps/api/package.json`
(`"@sr-home-tutors/api"`) — npm package names, never shown to an end user.
Rename only if you want the repo/package identity itself to reflect the new
customer (e.g. for a genuinely separate repo per customer rather than a
branch).

## Visual branding (not a text search — do these manually)

- **Color tokens**: `apps/web/src/styles/tokens.css` — the entire visual
  theme is CSS custom properties (`--color-primary-50`...`900`, grays,
  semantic success/warning/danger). Change the `--color-primary-*` scale
  to re-theme every button/link/focus-ring in the app from one file — see
  `02-ARCHITECTURE-AND-CONVENTIONS.md`'s styling section; nothing else
  should need touching for a color change since components consume these
  variables rather than hardcoded hex values.
- **Favicon / logo**: check `apps/web/index.html` and `apps/web/public/`
  for a favicon file, and `AppShell.tsx`'s "SR" logo-mark initials span —
  swap both for the new customer's initials/mark.
- **Legal/business-specific copy on the public HomePage**
  (`features/public-site/HomePage.tsx`) beyond just the org name — tagline
  wording, any claims specific to the current business, should be read
  through once per new customer even though the name itself is dynamic.

## Business-rule numbers that are genuinely per-customer, not per-brand

Not a "rebrand" item, but flag these to the new customer explicitly since
they're real operational decisions baked into the current deployment, not
universal constants — see `05-BUSINESS-RULES.md` for exactly where each
lives:

- `MIN_CHECKOUT_GAP_MINUTES` (50), `SHORT_CLASS_THRESHOLD_MINUTES` (40),
  `SHORT_CLASS_ESCALATION_COUNT` (3), `ATTENDANCE_GEOFENCE_RADIUS_METERS`
  (200, env-configurable).
- The `AddressProofType` enum (Aadhar/Voter ID/Driving License/Passport/
  Other) and `Board` enum (State/CBSE/ICSE/Other) are India-specific — a
  customer outside India would want these changed (requires a migration,
  see `02-ARCHITECTURE...md`'s migration recipe).
- Currency is an unlabeled `₹` literal throughout the frontend — no
  locale/currency config exists. A non-INR customer needs this searched
  and replaced (`grep -rn "₹" apps/web/src`) or, better, extracted into a
  currency-symbol constant once, the first time it comes up.

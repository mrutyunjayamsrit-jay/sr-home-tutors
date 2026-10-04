import "dotenv/config";
import { z } from "zod";

/**
 * All environment/config access in the app MUST go through this module.
 * Nothing else should call `process.env` directly — that's how secrets
 * end up hardcoded-by-accident or silently defaulted. Parsing happens once
 * at boot; the process exits immediately if config is invalid, rather than
 * limping along with undefined secrets.
 */

const isProd = process.env.NODE_ENV === "production";

// In production, secrets MUST be explicitly set (no fallback). In
// development/test we allow a fixed local-only fallback so `npm run dev`
// works out of the box, clearly labeled as insecure.
const devSecret = (label: string) => `dev-only-insecure-${label}-do-not-use-in-prod`;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    APP_URL: z.string().url(),
    WEB_URL: z.string().url(),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be >= 32 chars"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be >= 32 chars"),
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_TTL: z.string().default("30d"),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().url().optional(),

    COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be >= 32 chars"),
    // Set true only when the frontend and API are served from different
    // origins (e.g. web on Cloudflare Pages, API on its own domain/VM) —
    // the refresh cookie then needs SameSite=None (+ Secure, mandatory
    // alongside None) to survive a cross-site fetch at all. Leave false for
    // same-origin deployments (frontend served by/proxied through the same
    // origin as the API): SameSite=Strict there is strictly safer against
    // CSRF and doesn't need loosening. See token.service.ts refreshCookieOptions.
    COOKIE_CROSS_SITE: z.coerce.boolean().default(false),

    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./uploads"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    // How close (meters) a tutor's GPS must be to the parent's home for
    // location-verified attendance — see attendance.service.ts markWithLocation.
    ATTENDANCE_GEOFENCE_RADIUS_METERS: z.coerce.number().int().positive().default(200),

    // Only consumed by prisma/seed.ts to bootstrap the first login — not
    // used by the running server itself.
    SUPER_ADMIN_EMAIL: z.string().email().optional(),
    SUPER_ADMIN_PASSWORD: z.string().min(10).optional(),

    // Only consumed by prisma/seed.ts to create the demo Admin/Branch/
    // Tutor/Parent/Student accounts used for exercising the UI. Never
    // read by the running server. TEST_USER_PASSWORD has a clearly-labeled
    // insecure dev fallback (same pattern as the JWT/cookie secrets above)
    // so `npm run seed` works with zero config locally; ALLOW_TEST_SEED
    // must be explicitly set to seed these in a production environment.
    TEST_USER_PASSWORD: z.string().min(8).optional(),
    ALLOW_TEST_SEED: z.coerce.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.STORAGE_PROVIDER === "s3") {
      const required: Array<keyof typeof val> = [
        "S3_BUCKET",
        "S3_REGION",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
      ];
      for (const key of required) {
        if (!val[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_PROVIDER=s3`,
          });
        }
      }
    }
    if (val.NODE_ENV === "production") {
      if (val.JWT_ACCESS_SECRET.startsWith("dev-only-insecure")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["JWT_ACCESS_SECRET"], message: "must set a real secret in production" });
      }
      if (val.JWT_REFRESH_SECRET.startsWith("dev-only-insecure")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["JWT_REFRESH_SECRET"], message: "must set a real secret in production" });
      }
      if (val.COOKIE_SECRET.startsWith("dev-only-insecure")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["COOKIE_SECRET"], message: "must set a real secret in production" });
      }
    }
  });

// Treat empty-string env vars as "unset" rather than "set to empty string".
// Copying .env.example verbatim leaves plenty of `KEY=` lines with no value
// — without this, every optional-but-constrained field (e.g. a min-length
// password) would fail validation on a var the deployer never meant to set.
const cleanedProcessEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value === "" ? undefined : value]),
);

const rawEnv = {
  ...cleanedProcessEnv,
  APP_URL: process.env.APP_URL || "http://localhost:4000",
  WEB_URL: process.env.WEB_URL || "http://localhost:5173",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || (isProd ? undefined : devSecret("access")),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (isProd ? undefined : devSecret("refresh")),
  COOKIE_SECRET: process.env.COOKIE_SECRET || (isProd ? undefined : devSecret("cookie")),
  // The brute-force-relevant default (10/15min) is deliberately tight for
  // production. Left that tight in local dev, it trips almost immediately
  // while manually clicking through 5 test-account logins in a row — so
  // dev gets a much looser default unless the developer overrides it.
  LOGIN_RATE_LIMIT_MAX: process.env.LOGIN_RATE_LIMIT_MAX || (isProd ? undefined : "100"),
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const isGoogleOidcConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI,
);

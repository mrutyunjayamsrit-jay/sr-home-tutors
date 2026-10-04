import pino from "pino";
import { env } from "@/config/env";

/**
 * Structured logger. Redact paths cover the fields that must NEVER hit logs:
 * passwords, tokens, cookies, authorization headers, and raw KYC document
 * bytes. Add to this list whenever a new sensitive field is introduced —
 * don't rely on remembering to scrub call sites individually.
 */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.tokenHash",
      "*.googleSub",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
});

import { z } from "zod";

/**
 * For an optional string field that also has other constraints (min
 * length, email/regex format, etc). Plain `.optional()` only treats
 * `undefined` as "not provided" — but every uncontrolled HTML text input
 * left blank submits `""`, not `undefined`. Without this, "" fails the
 * inner constraint (e.g. min(6)) instead of being treated as omitted,
 * so a genuinely optional field becomes impossible to leave blank from a
 * real form. Normalizes "" to undefined after validating anything else.
 */
export function optionalString<T extends z.ZodString>(schema: T) {
  return schema
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));
}

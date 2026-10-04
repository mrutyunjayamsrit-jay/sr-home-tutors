import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generates a secure, human-typeable temporary password for admin-issued
 * accounts (tutor/parent/student). Never emailed/displayed as the
 * long-term credential — mustResetPassword forces a change on first login.
 * Avoids visually-ambiguous characters (0/O, 1/l/I) since this may be
 * read aloud or hand-copied by office staff.
 */
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

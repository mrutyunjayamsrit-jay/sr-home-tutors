import { generateTempPassword, hashPassword } from "./password.util";

export interface ResolvedCredential {
  passwordHash: string | null;
  /** Only populated when there's something the caller must hand off (a real temp
   * password to relay). Never populated when the admin set their own password —
   * they already know it, no need to echo it back. */
  tempPasswordToDisplay: string | null;
  mustResetPassword: boolean;
  wasGenerated: boolean;
  passwordSkipped: boolean;
}

const GMAIL_RE = /@gmail\.com$/i;

export function isGmailAddress(email: string | undefined | null): boolean {
  return Boolean(email && GMAIL_RE.test(email.trim()));
}

/**
 * One rule, shared by branch-admin creation and the Users & Roles "add
 * user" flow, for how a login's initial password gets set:
 *
 * 1. Super admin typed a password explicitly → use it verbatim, no forced
 *    reset (they already know it and presumably relayed it securely).
 * 2. No password given, but the email is @gmail.com → skip password auth
 *    entirely (passwordHash stays null); the account signs in with Google
 *    only. This is a deliberate option, not a fallback failure — plenty of
 *    real orgs run admin/branch staff on SSO-only accounts.
 * 3. No password given, non-Gmail email → generate a secure temp password
 *    with a forced reset on first login, same as the original behavior.
 */
export async function resolveInitialCredential(
  email: string | undefined,
  explicitPassword: string | undefined,
): Promise<ResolvedCredential> {
  if (explicitPassword) {
    return {
      passwordHash: await hashPassword(explicitPassword),
      tempPasswordToDisplay: null,
      mustResetPassword: false,
      wasGenerated: false,
      passwordSkipped: false,
    };
  }

  if (isGmailAddress(email)) {
    return {
      passwordHash: null,
      tempPasswordToDisplay: null,
      mustResetPassword: false,
      wasGenerated: false,
      passwordSkipped: true,
    };
  }

  const tempPassword = generateTempPassword();
  return {
    passwordHash: await hashPassword(tempPassword),
    tempPasswordToDisplay: tempPassword,
    mustResetPassword: true,
    wasGenerated: true,
    passwordSkipped: false,
  };
}

import type { UseFormRegisterReturn } from "react-hook-form";
import { PasswordField } from "./PasswordField";
import { Alert } from "./Alert";

const GMAIL_RE = /@gmail\.com$/i;

interface CredentialFieldsProps {
  email: string;
  register: UseFormRegisterReturn;
  error?: string;
}

/**
 * Shared password-entry fragment for every "create a login" form (branch
 * admin, and tutor/parent/student/branch-admin via Users & Roles). Password
 * is always optional client-side — what changes is the messaging and what
 * the backend does when it's left blank, based on whether the email is a
 * Gmail address (see credential.util.ts on the backend for the actual
 * three-way rule this describes).
 */
export function CredentialFields({ email, register, error }: CredentialFieldsProps) {
  const isGmail = GMAIL_RE.test(email.trim());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {isGmail && (
        <Alert variant="info">
          This is a Gmail address — this login can use "Sign in with Google." Leave the password blank to skip
          password login entirely, or set one as a backup.
        </Alert>
      )}
      <PasswordField
        label="Password (optional)"
        autoComplete="new-password"
        hint={
          isGmail
            ? "Leave blank for Google-only sign-in"
            : "Leave blank to auto-generate a secure temporary password"
        }
        error={error}
        {...register}
      />
    </div>
  );
}

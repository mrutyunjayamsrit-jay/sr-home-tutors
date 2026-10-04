import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, PasswordField, Alert, toast } from "@/components/ui";
import { useSetBranchPassword } from "./api";

const schema = z.object({
  password: z
    .string()
    .min(10, "At least 10 characters")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[0-9]/, "Include a number"),
});
type FormValues = z.infer<typeof schema>;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generatePassword(): string {
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/**
 * Sets a new password on this branch's office login directly — separate
 * mutation from the name/email/phone/address form above, since it's a
 * distinct, more sensitive action with its own success state (nothing here
 * is "dirty" tracked with the rest of the form).
 */
export function BranchPasswordSection({ branchId }: { branchId: string }) {
  const setPassword = useSetBranchPassword(branchId);
  const [justSet, setJustSet] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const handleGenerate = () => {
    setValue("password", generatePassword(), { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await setPassword.mutateAsync(values);
      setJustSet(values.password);
      reset();
      toast.success("Branch office password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    }
  };

  return (
    <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-default)" }}>
      <h3 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-base)" }}>Office login password</h3>
      <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
        Sets a new password for this branch's office login directly — the branch office is signed out everywhere and
        must use it on next sign-in.
      </p>

      {justSet && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Alert variant="warning">
            Save this now — it won't be shown again. Hand it to the branch office through a secure channel:{" "}
            <strong style={{ fontFamily: "monospace" }}>{justSet}</strong>
          </Alert>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}
        noValidate
      >
        <div style={{ minWidth: 240 }}>
          <PasswordField label="New password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        </div>
        <Button type="button" variant="secondary" onClick={handleGenerate}>
          Generate
        </Button>
        <Button type="submit" loading={setPassword.isPending}>
          Update password
        </Button>
      </form>
    </div>
  );
}

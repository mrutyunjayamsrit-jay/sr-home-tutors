import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, CredentialFields, Alert, toast } from "@/components/ui";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiError } from "@/lib/apiClient";
import { useRateCards } from "@/features/fees/api";
import { useAuthStore } from "@/features/auth/authStore";
import { matchRateCard } from "@/lib/rateCardMatch";
import type { ConvertCredentials } from "./types";
import type { ConvertEnquiryMutationInput } from "./api";

const schema = z.object({
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  password: z
    .string()
    .optional()
    .refine((v) => !v || (v.length >= 10 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v)), {
      message: "At least 10 characters, with upper/lowercase and a number",
    }),
  feesPrescribed: z.string().optional(),
  agreedFinalFees: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface ConvertEnquiryDialogProps {
  open: boolean;
  onClose: () => void;
  enquiryId: string | null;
  displayName: string;
  roleLabel: string; // "tutor" | "parent"
  mutation: UseMutationResult<{ credentials: ConvertCredentials }, ApiError, ConvertEnquiryMutationInput>;
  /** Parent conversion only — used to auto-prefill "Fees prescribed" from a matching Fee Rate Card, and to carry over whatever was already set on the enquiry. */
  studentClass?: string;
  board?: string;
  initialFeesPrescribed?: number | null;
  initialAgreedFinalFees?: number | null;
}

export function ConvertEnquiryDialog({
  open,
  onClose,
  enquiryId,
  displayName,
  roleLabel,
  mutation,
  studentClass,
  board,
  initialFeesPrescribed,
  initialAgreedFinalFees,
}: ConvertEnquiryDialogProps) {
  const isParent = roleLabel === "parent";
  const user = useAuthStore((s) => s.user);
  const rateCards = useRateCards({ branchId: user?.branchId ?? undefined });
  const [credentials, setCredentials] = useState<ConvertCredentials | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Fresh defaults every time a different enquiry is opened — carries over
  // whatever fees were already set when the enquiry was raised (see
  // CreateParentEnquiryDialog), letting the office confirm or correct them
  // as a last step before the login is actually created.
  useEffect(() => {
    if (!open) return;
    reset({
      email: "",
      password: "",
      feesPrescribed: initialFeesPrescribed != null ? String(initialFeesPrescribed) : "",
      agreedFinalFees: initialAgreedFinalFees != null ? String(initialAgreedFinalFees) : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, enquiryId]);

  // If the enquiry didn't already have a prescribed fee, fall back to
  // matching the class/board against Super Admin's Fee Rate Cards — never
  // overwrites a value the office has since typed in by hand.
  useEffect(() => {
    if (!open || !isParent || !board || !studentClass || initialFeesPrescribed != null) return;
    if (dirtyFields.feesPrescribed) return;
    const match = matchRateCard(rateCards.data ?? [], board, studentClass);
    if (match) setValue("feesPrescribed", String(match.ratePerClass));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isParent, board, studentClass, rateCards.data, initialFeesPrescribed]);

  const handleClose = () => {
    onClose();
  };

  const handleDone = () => {
    setCredentials(null);
    handleClose();
  };

  const onSubmit = async (values: FormValues) => {
    if (!enquiryId) return;
    try {
      const result = await mutation.mutateAsync({
        id: enquiryId,
        email: values.email || undefined,
        password: values.password || undefined,
        ...(isParent
          ? {
              feesPrescribed: values.feesPrescribed ? Number(values.feesPrescribed) : undefined,
              agreedFinalFees: values.agreedFinalFees ? Number(values.agreedFinalFees) : undefined,
            }
          : {}),
      });
      toast.success(`${displayName} registered as ${roleLabel}`);
      setCredentials(result.credentials);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    }
  };

  if (credentials) {
    return (
      <Modal open={open} onClose={handleDone} title="Registered" dismissible={false}>
        {credentials.passwordSkipped ? (
          <Alert variant="info">No password was set — this login signs in with Google only, using {credentials.email}.</Alert>
        ) : (
          <Alert variant="warning">
            {credentials.wasGenerated
              ? "Save this login now — the temporary password is shown only once."
              : "The password you set is active now."}
          </Alert>
        )}
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0 }}>
          <dt style={{ color: "var(--text-secondary)" }}>Username</dt>
          <dd style={{ margin: 0, fontFamily: "monospace" }}>{credentials.username}</dd>
          {credentials.email && (
            <>
              <dt style={{ color: "var(--text-secondary)" }}>Email</dt>
              <dd style={{ margin: 0 }}>{credentials.email}</dd>
            </>
          )}
          {credentials.tempPassword && (
            <>
              <dt style={{ color: "var(--text-secondary)" }}>{credentials.wasGenerated ? "Temp password" : "Password"}</dt>
              <dd style={{ margin: 0, fontFamily: "monospace", fontWeight: 700 }}>{credentials.tempPassword}</dd>
            </>
          )}
        </dl>
        <Button onClick={handleDone} fullWidth>
          Done
        </Button>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Register ${displayName} as ${roleLabel}`}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          This creates a login so they can access their dashboard. Email is optional — a username-only login works
          fine if you'd rather not collect one.
        </p>
        <TextField label="Email (optional)" type="email" error={errors.email?.message} {...register("email")} />
        <CredentialFields email={watch("email") ?? ""} register={register("password")} error={errors.password?.message} />
        {isParent && (
          <>
            <TextField
              label="Fees prescribed"
              type="number"
              step="0.01"
              hint="Prefilled from Super Admin's fee rate cards for this class/board — edit freely"
              error={errors.feesPrescribed?.message}
              {...register("feesPrescribed")}
            />
            <TextField
              label="Agreed final fees"
              type="number"
              step="0.01"
              hint="What you actually settled on with the parent — visible to Super Admin in Reports"
              error={errors.agreedFinalFees?.message}
              {...register("agreedFinalFees")}
            />
          </>
        )}
        <Button type="submit" loading={mutation.isPending} fullWidth>
          Register & create login
        </Button>
      </form>
    </Modal>
  );
}

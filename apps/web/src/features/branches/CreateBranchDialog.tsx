import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, CredentialFields, Alert } from "@/components/ui";
import { useCreateBranch } from "./api";
import type { AdminCredentials } from "./types";
import { toast } from "@/components/ui";

const schema = z.object({
  name: z.string().min(2, "Required"),
  code: z
    .string()
    .min(2, "Required")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Uppercase letters, numbers, - or _ only")
    .transform((v) => v.toUpperCase()),
  contactEmail: z.string().email("Enter a valid email"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  adminName: z.string().min(2, "Required"),
  password: z
    .string()
    .optional()
    .refine((v) => !v || (v.length >= 10 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v)), {
      message: "At least 10 characters, with upper/lowercase and a number",
    }),
});
type FormValues = z.infer<typeof schema>;

export function CreateBranchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBranch = useCreateBranch();
  const [credentials, setCredentials] = useState<AdminCredentials | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const handleClose = () => {
    setCredentials(null);
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await createBranch.mutateAsync({ ...values, password: values.password || undefined });
      setCredentials(result.adminCredentials);
      toast.success(`Branch "${result.branch.name}" created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create branch");
    }
  };

  if (credentials) {
    return (
      <Modal open={open} onClose={handleClose} title="Branch created" dismissible={false}>
        {credentials.passwordSkipped ? (
          <Alert variant="info">
            No password was set — this login signs in with Google only, using {credentials.email}.
          </Alert>
        ) : (
          <Alert variant="warning">
            {credentials.wasGenerated
              ? "Save this office login credential now — the temporary password is shown only once. Hand it to the branch office through a secure channel."
              : "The password you set is active now — no need to relay anything further."}
          </Alert>
        )}
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0 }}>
          <dt style={{ color: "var(--text-secondary)" }}>Username</dt>
          <dd style={{ margin: 0, fontFamily: "monospace" }}>{credentials.username}</dd>
          <dt style={{ color: "var(--text-secondary)" }}>Email</dt>
          <dd style={{ margin: 0 }}>{credentials.email}</dd>
          {credentials.tempPassword && (
            <>
              <dt style={{ color: "var(--text-secondary)" }}>{credentials.wasGenerated ? "Temp password" : "Password"}</dt>
              <dd style={{ margin: 0, fontFamily: "monospace", fontWeight: 700 }}>{credentials.tempPassword}</dd>
            </>
          )}
        </dl>
        <Button onClick={handleClose} fullWidth>
          Done
        </Button>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create branch">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <TextField label="Branch name" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Branch code"
          hint="Short unique code, e.g. BLR01. Also used to generate the office login."
          error={errors.code?.message}
          {...register("code")}
        />
        <TextField
          label="Office contact email"
          type="email"
          hint="The office assistant's login and invite go here."
          error={errors.contactEmail?.message}
          {...register("contactEmail")}
        />
        <TextField label="Office contact phone" error={errors.contactPhone?.message} {...register("contactPhone")} />
        <TextField label="Address" error={errors.address?.message} {...register("address")} />
        <TextField
          label="Office assistant name"
          error={errors.adminName?.message}
          {...register("adminName")}
        />
        <CredentialFields email={watch("contactEmail") ?? ""} register={register("password")} error={errors.password?.message} />
        <Button type="submit" loading={createBranch.isPending} fullWidth>
          Create branch
        </Button>
      </form>
    </Modal>
  );
}

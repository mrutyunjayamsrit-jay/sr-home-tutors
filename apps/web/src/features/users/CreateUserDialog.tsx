import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, CredentialFields, Alert } from "@/components/ui";
import { toast } from "@/components/ui";
import { useCreateUser, useParentOptions } from "./api";
import { useBranches } from "@/features/branches/api";
import type { CreateUserCredentials, CreateUserInput } from "./types";

const ROLE_OPTIONS = [
  { value: "BRANCH_ADMIN", label: "Branch Office" },
  { value: "TUTOR", label: "Tutor" },
  { value: "PARENT", label: "Parent" },
  { value: "STUDENT", label: "Student" },
];

const BOARD_OPTIONS = [
  { value: "STATE", label: "State Board" },
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "OTHER", label: "Other" },
];

const schema = z
  .object({
    role: z.enum(["BRANCH_ADMIN", "TUTOR", "PARENT", "STUDENT"], { errorMap: () => ({ message: "Choose a role" }) }),
    name: z.string().min(2, "Required"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .optional()
      .refine((v) => !v || (v.length >= 10 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v)), {
        message: "At least 10 characters, with upper/lowercase and a number",
      }),
    branchId: z.string().optional(),
    education: z.string().optional(),
    contactNumber: z.string().optional(),
    address: z.string().optional(),
    parentId: z.string().optional(),
    studentClass: z.string().optional(),
    board: z.enum(["STATE", "CBSE", "ICSE", "OTHER"]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role !== "STUDENT" && !val.branchId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["branchId"], message: "Required" });
    }
    if (val.role === "TUTOR") {
      if (!val.education) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["education"], message: "Required" });
      if (!val.contactNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactNumber"], message: "Required" });
      if (!val.address) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Required" });
    }
    if (val.role === "PARENT") {
      if (!val.contactNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactNumber"], message: "Required" });
      if (!val.address) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Required" });
    }
    if (val.role === "STUDENT") {
      if (!val.parentId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentId"], message: "Required" });
      if (!val.studentClass) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentClass"], message: "Required" });
      if (!val.board) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["board"], message: "Required" });
    }
  });
type FormValues = z.infer<typeof schema>;

function toPayload(v: FormValues): CreateUserInput {
  const shared = { name: v.name, email: v.email, password: v.password || undefined };
  switch (v.role) {
    case "TUTOR":
      return { role: "TUTOR", ...shared, branchId: v.branchId!, education: v.education!, contactNumber: v.contactNumber!, address: v.address! };
    case "PARENT":
      return { role: "PARENT", ...shared, branchId: v.branchId!, contactNumber: v.contactNumber!, address: v.address! };
    case "STUDENT":
      return { role: "STUDENT", ...shared, parentId: v.parentId!, studentClass: v.studentClass!, board: v.board! };
    default:
      return { role: "BRANCH_ADMIN", ...shared, branchId: v.branchId! };
  }
}

export function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser();
  const [credentials, setCredentials] = useState<CreateUserCredentials | null>(null);
  const { data: branchesData } = useBranches({ page: 1, pageSize: 100 });
  const branchOptions = (branchesData?.data ?? []).map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const role = watch("role");
  const { data: parents } = useParentOptions(watch("branchId") || undefined);
  const parentOptions = (parents ?? []).map((p) => ({ value: p.id, label: `${p.name} — ${p.contactNumber} (${p.branch.name})` }));

  const handleClose = () => {
    setCredentials(null);
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await createUser.mutateAsync(toPayload(values));
      setCredentials(result.credentials);
      toast.success(`${values.name} added as ${ROLE_OPTIONS.find((r) => r.value === values.role)?.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create user");
    }
  };

  if (credentials) {
    return (
      <Modal open={open} onClose={handleClose} title="User created" dismissible={false}>
        {credentials.passwordSkipped ? (
          <Alert variant="info">
            No password was set — this login signs in with Google only, using {credentials.email}.
          </Alert>
        ) : (
          <Alert variant="warning">
            {credentials.wasGenerated
              ? "Save this login now — the temporary password is shown only once. Hand it over through a secure channel."
              : "The password you set is active now."}
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
    <Modal open={open} onClose={handleClose} title="Add user">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <Select label="Role" placeholder="Choose a role" options={ROLE_OPTIONS} error={errors.role?.message} {...register("role")} />

        {role && (
          <>
            <TextField label="Full name" error={errors.name?.message} {...register("name")} />
            <TextField label="Email" type="email" error={errors.email?.message} {...register("email")} />

            {role !== "STUDENT" && (
              <Select
                label="Branch"
                placeholder="Choose a branch"
                options={branchOptions}
                error={errors.branchId?.message}
                {...register("branchId")}
              />
            )}

            {role === "TUTOR" && (
              <>
                <TextField label="Education" hint="e.g. M.Sc. Mathematics" error={errors.education?.message} {...register("education")} />
                <TextField label="Contact number" error={errors.contactNumber?.message} {...register("contactNumber")} />
                <TextField label="Address" error={errors.address?.message} {...register("address")} />
              </>
            )}

            {role === "PARENT" && (
              <>
                <TextField label="Contact number" error={errors.contactNumber?.message} {...register("contactNumber")} />
                <TextField label="Address" error={errors.address?.message} {...register("address")} />
              </>
            )}

            {role === "STUDENT" && (
              <>
                <Select
                  label="Parent"
                  placeholder={parentOptions.length ? "Choose a parent" : "No registered parents yet"}
                  options={parentOptions}
                  hint="A parent account must exist before adding their child. Add the parent first if needed."
                  error={errors.parentId?.message}
                  {...register("parentId")}
                />
                <TextField label="Class" placeholder="e.g. 10" error={errors.studentClass?.message} {...register("studentClass")} />
                <Select label="Board" placeholder="Choose a board" options={BOARD_OPTIONS} error={errors.board?.message} {...register("board")} />
              </>
            )}

            <CredentialFields email={watch("email") ?? ""} register={register("password")} error={errors.password?.message} />

            <Button type="submit" loading={createUser.isPending} fullWidth>
              Create login
            </Button>
          </>
        )}
      </form>
    </Modal>
  );
}

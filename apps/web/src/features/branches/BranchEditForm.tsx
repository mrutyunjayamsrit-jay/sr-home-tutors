import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, TextField, Card, Badge, Alert } from "@/components/ui";
import { toast } from "@/components/ui";
import { useUpdateBranch } from "./api";
import { BranchPasswordSection } from "./BranchPasswordSection";
import type { Branch } from "./types";

const schema = z.object({
  name: z.string().min(2, "Required"),
  contactEmail: z.string().email("Enter a valid email"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface BranchEditFormProps {
  branch: Branch;
  /** Only Super Admin can flip active/inactive — branch admins editing their own branch don't get this control. */
  canToggleActive?: boolean;
}

export function BranchEditForm({ branch, canToggleActive }: BranchEditFormProps) {
  const updateBranch = useUpdateBranch(branch.id);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: branch.name,
      contactEmail: branch.contactEmail ?? "",
      contactPhone: branch.contactPhone ?? "",
      address: branch.address ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateBranch.mutateAsync(values);
      toast.success("Branch details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    }
  };

  const toggleActive = async () => {
    try {
      await updateBranch.mutateAsync({ isActive: !branch.isActive });
      toast.success(branch.isActive ? "Branch deactivated" : "Branch activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    }
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-5)" }}>
        <div>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>{branch.name}</h2>
            <Badge tone={branch.isActive ? "success" : "neutral"}>{branch.isActive ? "Active" : "Inactive"}</Badge>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
            Code: <code>{branch.code}</code>
          </p>
        </div>
        {canToggleActive && (
          <Button variant={branch.isActive ? "danger" : "secondary"} size="sm" onClick={toggleActive}>
            {branch.isActive ? "Deactivate" : "Activate"}
          </Button>
        )}
      </div>

      {!canToggleActive && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Alert variant="info">Only the address can be changed here. Contact Super Admin to update the branch name, email, or phone.</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }} noValidate>
        <TextField
          label="Branch name"
          error={errors.name?.message}
          readOnly={!canToggleActive}
          {...register("name")}
        />
        <TextField
          label="Contact email"
          type="email"
          error={errors.contactEmail?.message}
          readOnly={!canToggleActive}
          {...register("contactEmail")}
        />
        <TextField
          label="Contact phone"
          error={errors.contactPhone?.message}
          readOnly={!canToggleActive}
          {...register("contactPhone")}
        />
        <TextField label="Address" error={errors.address?.message} {...register("address")} />
        <Button type="submit" loading={updateBranch.isPending} disabled={!isDirty} style={{ alignSelf: "flex-start" }}>
          Save changes
        </Button>
      </form>

      {canToggleActive && <BranchPasswordSection branchId={branch.id} />}
    </Card>
  );
}

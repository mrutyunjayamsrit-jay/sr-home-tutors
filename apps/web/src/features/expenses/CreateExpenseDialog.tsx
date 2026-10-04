import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useCreateExpense } from "./api";
import { useBranches } from "@/features/branches/api";
import { useAuthStore } from "@/features/auth/authStore";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import type { Expense } from "./types";

const schema = z.object({
  branchId: z.string().optional(),
  category: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  amount: z.string().min(1, "Required"),
  expenseDate: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

/**
 * Two-step: save the expense, then (same modal) optionally attach the
 * receipt — the expense needs a real id before a Document can be filed
 * against it, so this can't be one atomic submit.
 */
export function CreateExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { data: branches } = useBranches({ page: 1, pageSize: 100 }, isSuperAdmin);
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const createExpense = useCreateExpense();
  const [created, setCreated] = useState<Expense | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { expenseDate: new Date().toISOString().slice(0, 10) } });

  const handleClose = () => {
    setCreated(null);
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const expense = await createExpense.mutateAsync({
        branchId: values.branchId || undefined,
        category: values.category,
        description: values.description,
        amount: Number(values.amount),
        expenseDate: values.expenseDate,
      });
      toast.success("Expense recorded");
      setCreated(expense);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record expense");
    }
  };

  if (created) {
    return (
      <Modal open={open} onClose={handleClose} title="Attach a receipt">
        <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          Optional — attach a photo or PDF of the receipt for "{created.description}" (₹{created.amount}).
        </p>
        <DocumentsPanel ownerType="EXPENSE" ownerId={created.id} docType="RECEIPT" />
        <Button fullWidth onClick={handleClose} style={{ marginTop: "var(--space-4)" }}>
          Done
        </Button>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="New expense">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        {isSuperAdmin && (
          <Select label="Branch" placeholder="Choose a branch" options={branchOptions} error={errors.branchId?.message} {...register("branchId")} />
        )}
        <TextField label="Category" placeholder="Rent, Utilities, Salaries, Marketing..." error={errors.category?.message} {...register("category")} />
        <TextField label="Description" error={errors.description?.message} {...register("description")} />
        <TextField label="Amount (₹)" type="number" step="0.01" error={errors.amount?.message} {...register("amount")} />
        <TextField label="Date" type="date" error={errors.expenseDate?.message} {...register("expenseDate")} />
        <Button type="submit" loading={createExpense.isPending} fullWidth>
          Save expense
        </Button>
      </form>
    </Modal>
  );
}

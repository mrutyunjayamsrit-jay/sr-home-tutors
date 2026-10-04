import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useCreateInvoice } from "./api";
import { useAllParents } from "@/features/registration/api";

const schema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  period: z.string().min(1, "Required"),
  fixedClasses: z.string().min(1, "Required"),
  fixedFees: z.string().min(1, "Required"),
  dueDate: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CreateInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createInvoice = useCreateInvoice();
  const { data: parentsData } = useAllParents();
  const studentOptions = (parentsData?.data ?? []).flatMap((p) =>
    p.students.map((s) => ({ value: s.id, label: `${s.name} (Class ${s.studentClass}) — parent: ${p.name}` })),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { period: currentPeriod() } });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createInvoice.mutateAsync({
        studentId: values.studentId,
        period: values.period,
        fixedClasses: Number(values.fixedClasses),
        fixedFees: Number(values.fixedFees),
        dueDate: values.dueDate,
      });
      toast.success("Invoice created");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invoice");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New student fee invoice">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <Select
          label="Student"
          placeholder={studentOptions.length ? "Choose a student" : "No registered students yet"}
          options={studentOptions}
          error={errors.studentId?.message}
          {...register("studentId")}
        />
        <TextField label="Period" hint="e.g. 2026-08, or a package name" error={errors.period?.message} {...register("period")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <TextField label="Fixed classes" type="number" error={errors.fixedClasses?.message} {...register("fixedClasses")} />
          <TextField label="Fixed fees (₹)" type="number" step="0.01" error={errors.fixedFees?.message} {...register("fixedFees")} />
        </div>
        <TextField label="Due date" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
        <Button type="submit" loading={createInvoice.isPending} fullWidth>
          Create invoice
        </Button>
      </form>
    </Modal>
  );
}

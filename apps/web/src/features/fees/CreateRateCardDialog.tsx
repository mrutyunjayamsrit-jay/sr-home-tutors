import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useCreateRateCard } from "./api";
import { useBranches } from "@/features/branches/api";

const BOARD_OPTIONS = [
  { value: "STATE", label: "State Board" },
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "OTHER", label: "Other" },
];
const CYCLE_OPTIONS = [
  { value: "MONTHLY", label: "Monthly (per-class rate)" },
  { value: "PACKAGE", label: "Package (fixed bundle)" },
];

// Both cycles need "number of subjects". MONTHLY additionally needs a
// per-class rate; PACKAGE instead needs a fixed bundle — total classes and
// total amount for the whole package — never both shapes at once (see
// fees.types.ts's discriminated union on the API side, which this mirrors).
const schema = z
  .object({
    branchId: z.string().min(1, "Choose a branch"),
    board: z.string().min(1, "Choose a board"),
    classCategory: z.string().min(1, "Required"),
    billingCycle: z.enum(["MONTHLY", "PACKAGE"]),
    numberOfSubjects: z.string().min(1, "Required"),
    ratePerClass: z.string().optional(),
    totalClasses: z.string().optional(),
    totalAmount: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.billingCycle === "MONTHLY") {
      if (!values.ratePerClass) ctx.addIssue({ code: "custom", path: ["ratePerClass"], message: "Required" });
    } else {
      if (!values.totalClasses) ctx.addIssue({ code: "custom", path: ["totalClasses"], message: "Required" });
      if (!values.totalAmount) ctx.addIssue({ code: "custom", path: ["totalAmount"], message: "Required" });
    }
  });
type FormValues = z.infer<typeof schema>;

/**
 * Rate cards are a Super Admin-only decision (see fees.routes.ts
 * rateCardWriteAccess) — a Branch Admin can still read the rates when
 * raising an invoice, but only Super Admin ever opens this dialog, so it
 * always asks which branch the rate applies to.
 */
export function CreateRateCardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createRateCard = useCreateRateCard();
  const { data: branches } = useBranches({ page: 1, pageSize: 100 });
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { billingCycle: "MONTHLY" } });

  const billingCycle = watch("billingCycle");

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createRateCard.mutateAsync(
        values.billingCycle === "MONTHLY"
          ? {
              branchId: values.branchId,
              board: values.board,
              classCategory: values.classCategory,
              billingCycle: "MONTHLY",
              numberOfSubjects: Number(values.numberOfSubjects),
              ratePerClass: Number(values.ratePerClass),
            }
          : {
              branchId: values.branchId,
              board: values.board,
              classCategory: values.classCategory,
              billingCycle: "PACKAGE",
              numberOfSubjects: Number(values.numberOfSubjects),
              totalClasses: Number(values.totalClasses),
              totalAmount: Number(values.totalAmount),
            },
      );
      toast.success("Rate card added");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save rate card");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New fee rate card">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <Select label="Branch" placeholder="Choose a branch" options={branchOptions} error={errors.branchId?.message} {...register("branchId")} />
        <Select label="Board" placeholder="Choose a board" options={BOARD_OPTIONS} error={errors.board?.message} {...register("board")} />
        <TextField label="Class category" hint="e.g. 1-5, 6-10, 11-12, College" error={errors.classCategory?.message} {...register("classCategory")} />
        <Select label="Billing cycle" options={CYCLE_OPTIONS} {...register("billingCycle")} />

        <TextField
          label="Number of subjects"
          type="number"
          step="1"
          min="1"
          error={errors.numberOfSubjects?.message}
          {...register("numberOfSubjects")}
        />

        {billingCycle === "MONTHLY" ? (
          <TextField label="Rate per class (₹)" type="number" step="0.01" error={errors.ratePerClass?.message} {...register("ratePerClass")} />
        ) : (
          <>
            <TextField
              label="Total number of classes"
              type="number"
              step="1"
              min="1"
              hint="Total classes across all subjects for the whole package"
              error={errors.totalClasses?.message}
              {...register("totalClasses")}
            />
            <TextField label="Total amount (₹)" type="number" step="0.01" error={errors.totalAmount?.message} {...register("totalAmount")} />
          </>
        )}

        <Button type="submit" loading={createRateCard.isPending} fullWidth>
          Save rate card
        </Button>
      </form>
    </Modal>
  );
}

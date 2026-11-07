import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useCreateTask } from "./api";
import { useBranches } from "@/features/branches/api";
import { useAuthStore } from "@/features/auth/authStore";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const schema = z.object({
  // Required for Super Admin, ignored (and hidden) for a Branch Admin —
  // validated conditionally in onSubmit below rather than here, since the
  // same schema serves both roles.
  branchId: z.string().optional(),
  title: z.string().min(2, "Required"),
  description: z.string().optional(),
  assignedDate: z.string().min(1, "Required"),
  dueDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const isBranchAdmin = user?.role === "BRANCH_ADMIN";
  const createTask = useCreateTask();
  const { data: branches } = useBranches({ page: 1, pageSize: 100 }, !isBranchAdmin);
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { assignedDate: today() } });

  const handleClose = () => {
    reset({ assignedDate: today() });
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    if (!isBranchAdmin && !values.branchId) {
      setError("branchId", { message: "Choose a branch" });
      return;
    }
    try {
      await createTask.mutateAsync({
        branchId: isBranchAdmin ? undefined : values.branchId,
        title: values.title,
        description: values.description || undefined,
        assignedDate: values.assignedDate,
        dueDate: values.dueDate || undefined,
      });
      toast.success(isBranchAdmin ? "Task sent to Super Admin" : "Task assigned to branch");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create task");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={isBranchAdmin ? "Send a task to Super Admin" : "Assign a task"}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        {!isBranchAdmin && (
          <Select label="Branch" placeholder="Choose a branch" options={branchOptions} error={errors.branchId?.message} {...register("branchId")} />
        )}
        <TextField
          label="Title"
          hint={isBranchAdmin ? "e.g. Need approval for a fee waiver" : "e.g. Submit monthly attendance report"}
          error={errors.title?.message}
          {...register("title")}
        />
        <TextField label="Description (optional)" error={errors.description?.message} {...register("description")} />
        <TextField
          label="Assigned date"
          type="date"
          hint="Defaults to today — change it to backdate or schedule ahead"
          error={errors.assignedDate?.message}
          {...register("assignedDate")}
        />
        <TextField label="Due date (optional)" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
        <Button type="submit" loading={createTask.isPending} fullWidth>
          {isBranchAdmin ? "Send task" : "Assign task"}
        </Button>
      </form>
    </Modal>
  );
}

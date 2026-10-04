import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useCreateTask } from "./api";
import { useBranches } from "@/features/branches/api";

const schema = z.object({
  branchId: z.string().min(1, "Choose a branch"),
  title: z.string().min(2, "Required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createTask = useCreateTask();
  const { data: branches } = useBranches({ page: 1, pageSize: 100 });
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createTask.mutateAsync({
        branchId: values.branchId,
        title: values.title,
        description: values.description || undefined,
        dueDate: values.dueDate || undefined,
      });
      toast.success(`Task assigned to branch`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create task");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Assign a task">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <Select label="Branch" placeholder="Choose a branch" options={branchOptions} error={errors.branchId?.message} {...register("branchId")} />
        <TextField label="Title" hint="e.g. Submit monthly attendance report" error={errors.title?.message} {...register("title")} />
        <TextField label="Description (optional)" error={errors.description?.message} {...register("description")} />
        <TextField label="Due date (optional)" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
        <Button type="submit" loading={createTask.isPending} fullWidth>
          Assign task
        </Button>
      </form>
    </Modal>
  );
}

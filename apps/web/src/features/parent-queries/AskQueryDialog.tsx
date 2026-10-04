import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useCreateParentQuery } from "./api";

const TARGET_OPTIONS = [
  { value: "BRANCH", label: "My branch office" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

const schema = z.object({
  target: z.enum(["BRANCH", "SUPER_ADMIN"]),
  subject: z.string().min(2, "Give it a short subject").max(150),
  message: z.string().min(1, "Write your question").max(2000),
});
type FormValues = z.infer<typeof schema>;

export function AskQueryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createQuery = useCreateParentQuery();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { target: "BRANCH" } });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createQuery.mutateAsync(values);
      toast.success("Your query was sent");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your query");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Ask a question">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <Select label="Send to" options={TARGET_OPTIONS} {...register("target")} />
        <TextField label="Subject" placeholder="e.g. Fee due date" error={errors.subject?.message} {...register("subject")} />
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>Your question</span>
          <textarea
            rows={4}
            placeholder="Write your question…"
            {...register("message")}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              resize: "vertical",
            }}
          />
          {errors.message?.message && <span style={{ color: "var(--color-danger-500)", fontSize: "var(--text-xs)" }}>{errors.message.message}</span>}
        </label>
        <Button type="submit" loading={createQuery.isPending} fullWidth>
          Send question
        </Button>
      </form>
    </Modal>
  );
}

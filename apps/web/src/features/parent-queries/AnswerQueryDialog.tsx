import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, toast } from "@/components/ui";
import { useAnswerParentQuery } from "./api";
import type { ParentQuery } from "./types";

const schema = z.object({
  answer: z.string().min(1, "Write a reply").max(4000),
});
type FormValues = z.infer<typeof schema>;

export function AnswerQueryDialog({ query, onClose }: { query: ParentQuery | null; onClose: () => void }) {
  const answerQuery = useAnswerParentQuery();

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
    if (!query) return;
    try {
      await answerQuery.mutateAsync({ id: query.id, answer: values.answer });
      toast.success("Reply sent to the parent");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the reply");
    }
  };

  return (
    <Modal open={Boolean(query)} onClose={handleClose} title="Answer query">
      {query && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <strong>{query.subject}</strong>
            {query.askedBy && (
              <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                From {query.askedBy.name} · {query.askedBy.contactNumber}
              </p>
            )}
            <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{query.message}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>Your reply</span>
              <textarea
                rows={4}
                placeholder="Write your reply…"
                {...register("answer")}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-strong)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  resize: "vertical",
                }}
              />
              {errors.answer?.message && <span style={{ color: "var(--color-danger-500)", fontSize: "var(--text-xs)" }}>{errors.answer.message}</span>}
            </label>
            <Button type="submit" loading={answerQuery.isPending} fullWidth>
              Send reply
            </Button>
          </form>
        </div>
      )}
    </Modal>
  );
}

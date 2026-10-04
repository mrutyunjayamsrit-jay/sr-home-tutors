import { useState, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, Badge, toast } from "@/components/ui";
import { useReviews, useCreateReview } from "./api";
import type { Assignment } from "@/features/assignments/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const schema = z.object({
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  overallReview: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface StudentDetailModalProps {
  assignment: (Assignment & { attended?: number; absent?: number; remaining?: number; attendancePercent?: number }) | null;
  onClose: () => void;
}

export function StudentDetailModal({ assignment, onClose }: StudentDetailModalProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const { data: reviews } = useReviews(assignment?.id);
  const createReview = useCreateReview();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!assignment) return null;

  const onSubmit = async (values: FormValues) => {
    try {
      await createReview.mutateAsync({ assignmentId: assignment.id, ...values });
      toast.success("Review added");
      reset();
      setShowReviewForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save review");
    }
  };

  return (
    <Modal open={Boolean(assignment)} onClose={onClose} title={`${assignment.student.name} (Class ${assignment.student.studentClass})`}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <section>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", margin: 0, fontSize: "var(--text-sm)" }}>
            <dt style={{ color: "var(--text-secondary)" }}>Subjects</dt>
            <dd style={{ margin: 0 }}>{assignment.subjects.join(", ")}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Schedule</dt>
            <dd style={{ margin: 0 }}>
              {assignment.daysOfWeek.map((d) => DAY_LABELS[d]).join("/")} · {assignment.timeSlotStart}–{assignment.timeSlotEnd} (
              {assignment.classDurationMinutes} min)
            </dd>
            <dt style={{ color: "var(--text-secondary)" }}>Fixed classes/month</dt>
            <dd style={{ margin: 0 }}>{assignment.fixedClassesPerMonth}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Rate/class</dt>
            <dd style={{ margin: 0 }}>₹{assignment.perClassRate}</dd>
            {assignment.attendancePercent !== undefined && (
              <>
                <dt style={{ color: "var(--text-secondary)" }}>Attendance</dt>
                <dd style={{ margin: 0 }}>
                  {assignment.attended} attended · {assignment.absent} absent · {assignment.remaining} remaining ·{" "}
                  <strong>{assignment.attendancePercent}%</strong>
                </dd>
              </>
            )}
          </dl>
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <strong style={{ fontSize: "var(--text-sm)" }}>Opinion / progress notes</strong>
            <Button size="sm" variant="secondary" onClick={() => setShowReviewForm((v) => !v)}>
              {showReviewForm ? "Cancel" : "+ Add note"}
            </Button>
          </div>

          {showReviewForm && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "var(--space-3)" }}
              noValidate
            >
              <TextArea label="Strengths" error={errors.strengths?.message} {...register("strengths")} />
              <TextArea label="Weaknesses" error={errors.weaknesses?.message} {...register("weaknesses")} />
              <TextArea label="Overall review" error={errors.overallReview?.message} {...register("overallReview")} />
              <Button type="submit" size="sm" loading={createReview.isPending}>
                Save note
              </Button>
            </form>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxHeight: 260, overflowY: "auto" }}>
            {(reviews ?? []).length === 0 && !showReviewForm && (
              <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: 0 }}>
                No notes yet. Add one after a test or a few classes to track progress over time.
              </p>
            )}
            {(reviews ?? []).map((r) => (
              <div key={r.id} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <Badge tone="neutral">{new Date(r.reviewedAt).toLocaleDateString()}</Badge>
                </div>
                {r.strengths && (
                  <p style={{ margin: "4px 0", fontSize: "var(--text-sm)" }}>
                    <strong>Strengths:</strong> {r.strengths}
                  </p>
                )}
                {r.weaknesses && (
                  <p style={{ margin: "4px 0", fontSize: "var(--text-sm)" }}>
                    <strong>Weaknesses:</strong> {r.weaknesses}
                  </p>
                )}
                {r.overallReview && (
                  <p style={{ margin: "4px 0", fontSize: "var(--text-sm)" }}>
                    <strong>Overall:</strong> {r.overallReview}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}

// react-hook-form's register() hands back a `ref` alongside onChange/onBlur
// — it's how RHF reads an uncontrolled field's value on submit. A plain
// function component silently drops `ref` (React strips it before props
// even arrive), so without forwardRef here, RHF would find no value here
// no matter what the user typed. This is the standard fix whenever a
// custom input wraps a native input/textarea and needs to work with
// register() or Controller.
const TextArea = forwardRef<HTMLTextAreaElement, { label: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, ...rest }, ref) => (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>{label}</span>
      <textarea
        ref={ref}
        rows={2}
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-strong)",
          resize: "vertical",
        }}
        {...rest}
      />
      {error && <span style={{ color: "var(--color-danger-500)", fontSize: "var(--text-xs)" }}>{error}</span>}
    </label>
  ),
);
TextArea.displayName = "TextArea";

import { useEffect, useState } from "react";
import { Card, Button, TextField, Spinner, toast } from "@/components/ui";
import { useRating, useRateTutor } from "@/features/ratings/api";
import type { ChildAssignment } from "@/features/family/types";
import styles from "./ParentPerformancePage.module.css";

const STAR_COUNT = 5;

/**
 * A parent's own rating of this tutor, based on the child's actual
 * progress — separate from (and never visible alongside) the office's own
 * interview assessment of the tutor at registration. One rating per
 * assignment, revisable at any time as progress continues; shown next to
 * TutorReviewCard's read-only notes so both sides of the relationship sit
 * on the same page.
 */
export function RateTutorCard({ assignment }: { assignment: ChildAssignment }) {
  const { data: existing, isLoading } = useRating(assignment.id);
  const rateTutor = useRateTutor();

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (existing) {
      setStars(existing.rating);
      setComment(existing.comment ?? "");
    }
  }, [existing]);

  const handleSubmit = async () => {
    if (stars < 1) {
      toast.error("Pick a star rating first");
      return;
    }
    try {
      await rateTutor.mutateAsync({ assignmentId: assignment.id, rating: stars, comment: comment || undefined });
      toast.success(`Rating saved for ${assignment.tutor.name}`);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save rating");
    }
  };

  if (isLoading) return <Spinner size="sm" />;

  const showForm = editing || !existing;

  return (
    <Card className={styles.reviewCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: "var(--text-base)" }}>
          Rate {assignment.tutor.name} <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>· based on progress so far</span>
        </h3>
        {existing && !editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Update rating
          </Button>
        )}
      </div>

      {showForm ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--text-2xl)",
                  lineHeight: 1,
                  padding: 0,
                  color: n <= stars ? "var(--color-warning-500)" : "var(--border-strong)",
                }}
              >
                ★
              </button>
            ))}
          </div>
          <TextField
            label="Comment (optional)"
            placeholder="What's going well, or what you'd like to see change"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button size="sm" onClick={handleSubmit} loading={rateTutor.isPending}>
              {existing ? "Save changes" : "Submit rating"}
            </Button>
            {existing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStars(existing.rating);
                  setComment(existing.comment ?? "");
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "var(--space-2)" }}>
          <span style={{ color: "var(--color-warning-500)", fontSize: "var(--text-lg)" }}>{"★".repeat(existing!.rating)}</span>
          <span style={{ color: "var(--border-strong)", fontSize: "var(--text-lg)" }}>{"★".repeat(STAR_COUNT - existing!.rating)}</span>
          {existing!.comment && <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>{existing!.comment}</p>}
        </div>
      )}
    </Card>
  );
}

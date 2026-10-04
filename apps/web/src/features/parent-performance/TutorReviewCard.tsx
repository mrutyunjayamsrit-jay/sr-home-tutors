import { Card, Spinner } from "@/components/ui";
import { useReviews } from "@/features/my-students/api";
import type { ChildAssignment } from "@/features/family/types";
import styles from "./ParentPerformancePage.module.css";

/** One tutor's latest written feedback for this child — a small self-contained
 * card so each assignment can fetch its own reviews independently (a child
 * with two tutors, e.g. Math + Science, gets one card per tutor). */
export function TutorReviewCard({ assignment }: { assignment: ChildAssignment }) {
  const { data: reviews, isLoading } = useReviews(assignment.id);
  const latest = reviews?.[0];

  if (isLoading) return <Spinner size="sm" />;
  if (!latest) return null;

  return (
    <Card className={styles.reviewCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: "var(--text-base)" }}>
          {assignment.tutor.name}'s notes <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>· {assignment.subjects.join(", ")}</span>
        </h3>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{new Date(latest.reviewedAt).toLocaleDateString()}</span>
      </div>
      <div className={styles.reviewGrid}>
        {latest.strengths && (
          <div className={styles.reviewBlock}>
            <h4>Strengths</h4>
            <p>{latest.strengths}</p>
          </div>
        )}
        {latest.weaknesses && (
          <div className={styles.reviewBlock}>
            <h4>Needs work</h4>
            <p>{latest.weaknesses}</p>
          </div>
        )}
        {latest.overallReview && (
          <div className={styles.reviewBlock}>
            <h4>Overall</h4>
            <p>{latest.overallReview}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

import type { ReactNode } from "react";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";
import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  value?: ReactNode;
  loading?: boolean;
  hint?: string;
}

export function StatCard({ label, value, loading, hint }: StatCardProps) {
  return (
    <Card className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{loading ? <Skeleton width={48} height="1.8rem" /> : value}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </Card>
  );
}

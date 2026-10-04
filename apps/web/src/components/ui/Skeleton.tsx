import styles from "./Skeleton.module.css";

export function Skeleton({ width, height = "1em" }: { width?: string | number; height?: string | number }) {
  return <span className={styles.skeleton} style={{ width, height }} aria-hidden="true" />;
}

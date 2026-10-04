import type { ReactNode } from "react";
import styles from "./Alert.module.css";

interface AlertProps {
  variant?: "info" | "success" | "warning" | "danger";
  children: ReactNode;
}

export function Alert({ variant = "info", children }: AlertProps) {
  return (
    <div className={[styles.alert, styles[variant]].join(" ")} role={variant === "danger" ? "alert" : "status"}>
      {children}
    </div>
  );
}

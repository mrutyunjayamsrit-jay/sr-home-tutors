import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, disabled, children, className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={[styles.button, styles[variant], styles[size], fullWidth ? styles.fullWidth : "", className]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading && <Spinner size="sm" />}
        <span className={[styles.content, loading ? styles.loadingLabel : ""].filter(Boolean).join(" ")}>
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

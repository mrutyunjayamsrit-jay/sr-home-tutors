import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import textFieldStyles from "./TextField.module.css";
import styles from "./PasswordField.module.css";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
}

/** TextField's password-specific sibling: adds a show/hide toggle without overloading TextField's props. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, hint, id, className, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;

    return (
      <div className={textFieldStyles.field}>
        <label htmlFor={fieldId} className={textFieldStyles.label}>
          {label}
        </label>
        <div className={styles.wrapper}>
          <input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            className={[textFieldStyles.input, styles.input, error ? textFieldStyles.inputError : "", className]
              .filter(Boolean)
              .join(" ")}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
            {...rest}
          />
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={-1}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {hint && !error && (
          <p id={hintId} className={textFieldStyles.hint}>
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className={textFieldStyles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
PasswordField.displayName = "PasswordField";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.5 5.2A11 11 0 0 1 12 5c7 0 11 7 11 7a13.2 13.2 0 0 1-3.4 4M6.6 6.6C3.7 8.3 2 12 2 12s4 7 11 7a10.6 10.6 0 0 0 2.9-.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

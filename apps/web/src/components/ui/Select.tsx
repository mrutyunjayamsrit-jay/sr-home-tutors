import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import textFieldStyles from "./TextField.module.css";
import styles from "./Select.module.css";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, hint, id, className, value, ...rest }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;
    // Uncontrolled (react-hook-form's register, no `value` passed) needs
    // defaultValue so the placeholder option starts selected. Controlled
    // usage (a plain useState filter, passing `value`) must NOT also get
    // defaultValue — React warns/conflicts if both are set on a <select>.
    const uncontrolledProps = value === undefined ? { defaultValue: "" } : { value };

    return (
      <div className={textFieldStyles.field}>
        <label htmlFor={fieldId} className={textFieldStyles.label}>
          {label}
        </label>
        <select
          ref={ref}
          id={fieldId}
          className={[textFieldStyles.input, styles.select, error ? textFieldStyles.inputError : "", className]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          {...uncontrolledProps}
          {...rest}
        >
          {/* Not disabled: a filter Select needs this re-selectable to get back to
              "All ..."/unfiltered, and a required-field Select just re-triggers its
              own validation if a user backs out to it — never silently unremovable. */}
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
Select.displayName = "Select";

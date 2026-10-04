import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./Checkbox.module.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, className, ...rest }, ref) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <label htmlFor={fieldId} className={styles.wrapper}>
      <input ref={ref} id={fieldId} type="checkbox" className={[styles.input, className].filter(Boolean).join(" ")} {...rest} />
      <span>{label}</span>
    </label>
  );
});
Checkbox.displayName = "Checkbox";

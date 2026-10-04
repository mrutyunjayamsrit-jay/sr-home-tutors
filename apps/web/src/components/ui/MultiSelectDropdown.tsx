import { useEffect, useId, useRef, useState } from "react";
import textFieldStyles from "./TextField.module.css";
import styles from "./MultiSelectDropdown.module.css";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  /** Label for the "select everything" row — defaults to "All". */
  allLabel?: string;
}

/**
 * A dropdown of checkboxes rather than a single native `<select>` — for
 * fields where more than one option can genuinely apply at once (e.g. a
 * tutor willing to teach more than one category). The "All" row is derived,
 * never stored as its own state: it shows checked exactly when every option
 * is individually selected, and unchecking any one option drops it on its
 * own — so "all selected" and "all individually checked" can never drift
 * apart.
 */
export function MultiSelectDropdown({ label, options, value, onChange, placeholder = "Select…", error, hint, allLabel = "All" }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      // Stop this from also being seen as "close the dialog" by a native
      // <dialog> ancestor (e.g. this dropdown open inside a Modal) — Escape
      // here should only ever close the dropdown's own panel.
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const allChecked = options.length > 0 && options.every((opt) => value.includes(opt.value));

  const toggleAll = () => {
    onChange(allChecked ? [] : options.map((opt) => opt.value));
  };

  const toggleOption = (optValue: string) => {
    onChange(value.includes(optValue) ? value.filter((v) => v !== optValue) : [...value, optValue]);
  };

  const selectedLabels = options.filter((opt) => value.includes(opt.value)).map((opt) => opt.label);
  const summaryText = value.length === 0 ? placeholder : allChecked ? allLabel : selectedLabels.join(", ");

  return (
    <div className={textFieldStyles.field}>
      <label htmlFor={fieldId} className={textFieldStyles.label}>
        {label}
      </label>
      <div className={styles.wrapper} ref={containerRef}>
        <button
          type="button"
          id={fieldId}
          className={[textFieldStyles.input, styles.trigger, error ? textFieldStyles.inputError : ""].filter(Boolean).join(" ")}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={[styles.triggerText, value.length === 0 ? styles.placeholder : ""].filter(Boolean).join(" ")}>{summaryText}</span>
          <span className={[styles.chevron, open ? styles.chevronOpen : ""].filter(Boolean).join(" ")} aria-hidden="true">
            ▾
          </span>
        </button>

        {open && (
          <div className={styles.panel} role="listbox" aria-multiselectable="true">
            <label className={[styles.option, styles.optionAll].join(" ")}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              {allLabel}
            </label>
            <div className={styles.divider} />
            {options.map((opt) => (
              <label key={opt.value} className={styles.option}>
                <input type="checkbox" checked={value.includes(opt.value)} onChange={() => toggleOption(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        )}
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
}

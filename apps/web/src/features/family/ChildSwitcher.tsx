import type { Child } from "./types";
import styles from "./ChildSwitcher.module.css";

interface ChildSwitcherProps {
  children: Child[];
  selectedChildId: string | undefined;
  onSelect: (id: string) => void;
}

/** Only renders when there's a real choice to make — one child means one fixed context, no switcher needed. */
export function ChildSwitcher({ children, selectedChildId, onSelect }: ChildSwitcherProps) {
  if (children.length <= 1) return null;

  return (
    <div className={styles.switcher} role="tablist" aria-label="Choose a child">
      {children.map((c) => {
        const active = c.id === selectedChildId;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? styles.pillActive : styles.pill}
            onClick={() => onSelect(c.id)}
          >
            <span className={styles.avatar} aria-hidden="true">
              {c.name.charAt(0).toUpperCase()}
            </span>
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

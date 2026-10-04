import { useEffect, useId, useRef } from "react";
import type { ReactNode, MouseEvent } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Set false for flows that must be explicitly acknowledged (e.g. "save this password now"). */
  dismissible?: boolean;
}

/**
 * Built on the native <dialog> element: free focus trap, ESC-to-close, and
 * top-layer stacking without a custom implementation. We only add backdrop
 * click-to-close and wire `open` to imperative show/close calls.
 */
export function Modal({ open, onClose, title, children, footer, dismissible = true }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Unique per instance — a static id breaks aria-labelledby (and thus the
  // dialog's accessible name) the moment more than one Modal is mounted on
  // the same page, since duplicate DOM ids all resolve to the first match.
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (dismissible && e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault();
      }}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
    >
      <div className={styles.content}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </dialog>
  );
}

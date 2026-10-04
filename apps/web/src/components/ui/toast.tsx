import { create } from "zustand";
import { useEffect } from "react";
import styles from "./toast.module.css";

type ToastTone = "success" | "danger" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastItem[];
  push: (message: string, tone: ToastTone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (message, tone) => set((s) => ({ items: [...s.items, { id: nextId++, message, tone }] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

/** Call from anywhere (not just components) — e.g. toast.success("Branch created"). */
export const toast = {
  success: (message: string) => useToastStore.getState().push(message, "success"),
  error: (message: string) => useToastStore.getState().push(message, "danger"),
  info: (message: string) => useToastStore.getState().push(message, "info"),
};

function ToastRow({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), 5000);
    return () => clearTimeout(t);
  }, [item.id, dismiss]);

  return (
    <div className={[styles.toast, styles[item.tone]].join(" ")} role="status">
      <span>{item.message}</span>
      <button className={styles.close} onClick={() => dismiss(item.id)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export function Toaster() {
  const items = useToastStore((s) => s.items);
  if (items.length === 0) return null;
  return (
    <div className={styles.container}>
      {items.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
    </div>
  );
}

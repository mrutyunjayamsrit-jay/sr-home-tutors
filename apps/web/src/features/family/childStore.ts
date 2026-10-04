import { create } from "zustand";

const STORAGE_KEY = "sr-parent-selected-child";

interface ChildSelectionState {
  selectedChildId: string | null;
  selectChild: (id: string) => void;
  /** Ensures a valid child is always selected once the children list loads — falls back to the first child if nothing (or a stale/foreign id) is stored. */
  ensureSelection: (availableIds: string[]) => void;
}

export const useChildStore = create<ChildSelectionState>((set, get) => ({
  selectedChildId: typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null,
  selectChild: (id) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    set({ selectedChildId: id });
  },
  ensureSelection: (availableIds) => {
    if (availableIds.length === 0) return;
    const current = get().selectedChildId;
    if (current && availableIds.includes(current)) return;
    const fallback = availableIds[0]!;
    window.localStorage.setItem(STORAGE_KEY, fallback);
    set({ selectedChildId: fallback });
  },
}));

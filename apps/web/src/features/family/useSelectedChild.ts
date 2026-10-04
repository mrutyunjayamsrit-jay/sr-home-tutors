import { useEffect } from "react";
import { useChildren } from "./api";
import { useChildStore } from "./childStore";

/** Shared by every Parent page: the children list, plus whichever one is currently selected (persisted across pages/reloads, auto-falls back to the first child). */
export function useSelectedChild() {
  const children = useChildren();
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const selectChild = useChildStore((s) => s.selectChild);
  const ensureSelection = useChildStore((s) => s.ensureSelection);

  useEffect(() => {
    if (children.data) ensureSelection(children.data.map((c) => c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children.data]);

  const validId = children.data?.some((c) => c.id === selectedChildId) ? (selectedChildId ?? undefined) : (children.data?.[0]?.id ?? undefined);

  return {
    children: children.data ?? [],
    isLoading: children.isLoading,
    selectedChildId: validId,
    selectedChild: children.data?.find((c) => c.id === validId),
    selectChild,
  };
}

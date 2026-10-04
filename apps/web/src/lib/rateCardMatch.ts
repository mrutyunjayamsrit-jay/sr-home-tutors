import type { FeeRateCard } from "@/features/fees/types";

/**
 * Best-effort match between a chosen board+class and one of Super Admin's
 * Fee Rate Cards, so "Fees prescribed" on the New Parent Enquiry form can
 * prefill from Super Admin's own numbers instead of a blank field. A rate
 * card's classCategory is free text (see CreateRateCardDialog.tsx's hint:
 * "e.g. 1-5, 6-10, 11-12, College"), not an enum, so this stays forgiving
 * rather than exact: a numeric class ("8") matches a "low-high" range that
 * contains it, or a category that's that exact number; a non-numeric class
 * (a degree/course name) matches the first non-numeric category for that
 * board. Returns undefined — never a guessed number — when nothing lines
 * up, so the field just stays blank and freely editable.
 */
export function matchRateCard(rateCards: FeeRateCard[], board: string, studentClass: string): FeeRateCard | undefined {
  const forBoard = rateCards.filter((r) => r.board === board);
  if (forBoard.length === 0) return undefined;

  const trimmed = studentClass.trim();
  const classNum = Number(trimmed);
  const isNumeric = trimmed !== "" && Number.isFinite(classNum);

  if (isNumeric) {
    return forBoard.find((r) => {
      const range = r.classCategory.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
      if (range) return classNum >= Number(range[1]) && classNum <= Number(range[2]);
      const single = r.classCategory.match(/^\s*(\d+)\s*$/);
      if (single) return classNum === Number(single[1]);
      return false;
    });
  }

  // A degree/course name — match a category that isn't itself a numeric class range.
  return forBoard.find((r) => !/^\s*\d+\s*(-\s*\d+)?\s*$/.test(r.classCategory));
}

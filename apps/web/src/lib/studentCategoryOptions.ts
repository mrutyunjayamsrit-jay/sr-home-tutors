/**
 * Drives the "I need a tutor" form's cascading Category → Class picker.
 * Purely a client-side UX aid — the backend only ever sees the resulting
 * `studentClass` string (unchanged shape), so no schema/API changes were
 * needed to add this.
 */
export type StudentCategory = "PRIMARY" | "HIGHSCHOOL" | "SECONDARY" | "DEGREE";

export const STUDENT_CATEGORY_OPTIONS: { value: StudentCategory; label: string }[] = [
  { value: "PRIMARY", label: "Primary (Class 1–7)" },
  { value: "HIGHSCHOOL", label: "High School (Class 8–10)" },
  { value: "SECONDARY", label: "Secondary (Class 11–12)" },
  { value: "DEGREE", label: "Degree" },
];

function range(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
}

// Common Indian undergrad/postgrad degrees — not exhaustive, so "Other"
// stays as an escape hatch rather than blocking submission on an unlisted one.
const DEGREE_OPTIONS = [
  "B.A.",
  "B.Sc.",
  "B.Com.",
  "BBA",
  "BCA",
  "B.Tech / B.E.",
  "B.Ed",
  "LLB",
  "MBBS",
  "M.A.",
  "M.Sc.",
  "M.Com.",
  "MBA",
  "MCA",
  "M.Tech",
  "Other",
];

/** The Class/Course options for a chosen category — empty until a category is picked. */
export function getClassOptions(category: string | undefined): { value: string; label: string }[] {
  switch (category as StudentCategory | undefined) {
    case "PRIMARY":
      return range(1, 7).map((c) => ({ value: c, label: `Class ${c}` }));
    case "HIGHSCHOOL":
      return range(8, 10).map((c) => ({ value: c, label: `Class ${c}` }));
    case "SECONDARY":
      return range(11, 12).map((c) => ({ value: c, label: `Class ${c}` }));
    case "DEGREE":
      return DEGREE_OPTIONS.map((d) => ({ value: d, label: d }));
    default:
      return [];
  }
}

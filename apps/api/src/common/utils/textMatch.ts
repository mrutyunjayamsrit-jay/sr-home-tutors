// Common filler words in Indian addresses that would otherwise dominate the
// overlap and make two unrelated addresses look like a match (e.g. every
// address has "road" or "near" in it).
const STOPWORDS = new Set([
  "the", "near", "road", "street", "layout", "nagar", "cross", "main", "opp",
  "opposite", "apartment", "apartments", "flat", "house", "no", "and", "for",
  "block", "phase", "stage", "colony", "extension", "sector",
]);

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}

/**
 * Loose "does this typed area plausibly refer to the same place as this
 * stored address" check — there's no geocoding service wired up, so this is
 * a text-overlap heuristic, not a real location match. At least one
 * meaningful word shared between the two (ignoring generic address filler
 * words) counts as a match.
 */
export function areaLooksLikeMatch(typedArea: string, storedAddress: string): boolean {
  const typedWords = significantWords(typedArea);
  const storedWords = significantWords(storedAddress);
  if (typedWords.size === 0 || storedWords.size === 0) return false;
  for (const word of typedWords) {
    if (storedWords.has(word)) return true;
  }
  return false;
}

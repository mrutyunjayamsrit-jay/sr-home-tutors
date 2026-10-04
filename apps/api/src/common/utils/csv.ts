/**
 * Minimal CSV serializer for report exports. Deliberately not a full
 * "PDF or Excel" generator (the PDF spec's literal ask) — CSV opens
 * natively in Excel/Sheets and needs no extra dependency (pdfkit/exceljs)
 * for what is, for now, tabular report data. See docs/DECISIONS.md.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[],
): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  return [header, ...body].join("\r\n");
}

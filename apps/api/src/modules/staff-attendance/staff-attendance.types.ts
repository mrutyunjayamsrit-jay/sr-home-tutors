import { z } from "zod";

// `at` is a full instant (ISO datetime), constructed client-side from the
// browser's own local time — never a bare "HH:mm" reconstructed
// server-side (see common/utils/istDate.ts for why that was a real bug).
// The client still lets a branch admin pick a time other than "now" (to
// back-fill a day they forgot), it just always sends the complete,
// unambiguous instant rather than a string the server would have to guess
// a timezone for.
export const checkTimeSchema = z.object({
  at: z.coerce.date(),
});
export type CheckTimeInput = z.infer<typeof checkTimeSchema>;

export const listMineQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const overviewQuerySchema = z.object({
  date: z.coerce.date().optional(),
});

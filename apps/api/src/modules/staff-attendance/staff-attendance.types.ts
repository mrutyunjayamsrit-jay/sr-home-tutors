import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const checkTimeSchema = z.object({
  // Defaults to today — lets a branch admin back-fill a day they forgot,
  // not just mark the current moment.
  date: z.coerce.date().optional(),
  time: z.string().regex(TIME_RE, "Use 24h HH:mm"),
});
export type CheckTimeInput = z.infer<typeof checkTimeSchema>;

export const listMineQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const overviewQuerySchema = z.object({
  date: z.coerce.date().optional(),
});

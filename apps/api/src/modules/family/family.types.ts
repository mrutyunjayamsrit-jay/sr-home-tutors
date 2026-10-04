import { z } from "zod";

export const childIdParamSchema = z.object({ studentId: z.string().cuid() });

export const updateMyLocationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type UpdateMyLocationInput = z.infer<typeof updateMyLocationSchema>;

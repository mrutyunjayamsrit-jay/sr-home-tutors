import { z } from "zod";

export const updateSettingsSchema = z.object({
  organizationName: z.string().min(2).max(150).optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().max(20).optional().or(z.literal("")),
  tutorRulesText: z.string().min(10).max(4000).optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

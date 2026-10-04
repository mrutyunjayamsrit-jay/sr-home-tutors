import { z } from "zod";

/**
 * Shared strength rule for every admin-set password in the system (self
 * password change, and — since super admins can now type a password
 * directly for non-Gmail branch/tutor/parent/student logins instead of
 * always auto-generating one — user creation too). One rule, one place.
 */
export const strongPasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[0-9]/, "Must include a number");

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your email or username"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(true),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: strongPasswordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const acknowledgeRulesSchema = z.object({
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the institute rules to continue" }),
  }),
});

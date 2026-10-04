import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Button, Card, TextField, Alert } from "@/components/ui";
import { authApi } from "./api";
import { useAuthStore } from "./authStore";
import { setAccessToken } from "@/lib/apiClient";
import styles from "@/components/ui/AuthLayout.module.css";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current/temporary password"),
    newPassword: z
      .string()
      .min(10, "At least 10 characters")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      // Backend revokes all refresh tokens on password change — the current
      // session (including this cookie) is now invalid by design, so send
      // the user back to a normal login with the new password.
      setAccessToken(null);
      useAuthStore.setState({ user: null, status: "unauthenticated" });
      navigate("/login", { replace: true, state: { passwordChanged: true } });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not change password");
    }
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div>
          <h1 className={styles.title}>Set a new password</h1>
          <p className={styles.subtitle}>
            {user?.mustResetPassword
              ? "For security, you must set your own password before continuing."
              : "Choose a new password."}
          </p>
        </div>

        {serverError && <Alert variant="danger">{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <TextField
            label="Current / temporary password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 10 characters, with upper/lowercase and a number"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Button type="submit" fullWidth loading={isSubmitting}>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}

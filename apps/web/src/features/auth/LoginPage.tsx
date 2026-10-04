import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button, TextField, PasswordField, Checkbox, Alert, Modal } from "@/components/ui";
import { useAuthStore } from "./authStore";
import { authApi } from "./api";
import { ROLE_HOME_PATH } from "./types";
import { EducationIllustration } from "./EducationIllustration";
import styles from "./LoginPage.module.css";

const schema = z.object({
  identifier: z.string().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
  rememberMe: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const FEATURES = [
  "Enquiries to registration, tracked end to end",
  "Attendance and payroll that reconcile themselves",
  "One dashboard, every branch, every role",
];

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rememberMe: true } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const user = await login(values.identifier, values.password, values.rememberMe);
      if (user.mustResetPassword) {
        navigate("/reset-password", { replace: true });
        return;
      }
      const redirectTo = (location.state as { from?: string } | null)?.from;
      navigate(redirectTo ?? ROLE_HOME_PATH[user.role], { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.brandMark}>
            <span className={styles.logoMark}>SR</span>
            <span className={styles.brandName}>SR Home Tutors</span>
          </div>
          <h1 className={styles.headline}>Run your home-tutoring institute like a modern school.</h1>
          <p className={styles.subheadline}>
            From the first enquiry to every month's payout — one platform for admins, branch offices, tutors,
            parents, and students.
          </p>
          <ul className={styles.featureList}>
            {FEATURES.map((f) => (
              <li key={f}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          <div className={styles.illustration}>
            <EducationIllustration />
          </div>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formCard}>
          <Link to="/" className={styles.backLink}>
            <BackArrowIcon />
            Back to home
          </Link>

          <div className={styles.formHeader}>
            <span className={styles.mobileLogoMark}>SR</span>
            <h2 className={styles.title}>Welcome back</h2>
            <p className={styles.subtitle}>Sign in to continue to your dashboard</p>
          </div>

          {serverError && <Alert variant="danger">{serverError}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
            <TextField
              label="Email or username"
              autoComplete="username"
              autoFocus
              error={errors.identifier?.message}
              {...register("identifier")}
            />
            <PasswordField
              label="Password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            <div className={styles.formRow}>
              <Checkbox label="Remember me" {...register("rememberMe")} />
              <button type="button" className={styles.linkButton} onClick={() => setForgotOpen(true)}>
                Forgot password?
              </button>
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} size="lg">
              Sign in
            </Button>
          </form>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={() => (window.location.href = authApi.googleSignInUrl())}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <p className={styles.googleHint}>Google sign-in is for Super Admin and Branch Office accounts only.</p>
        </div>
      </section>

      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot your password?">
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Self-service password reset isn't available yet. Tutor, parent, and student passwords are issued and reset
          by your branch office; branch office and super admin passwords can be reset by a super admin, or by signing
          in with Google if that's enabled for your account.
        </p>
        <Button onClick={() => setForgotOpen(false)} fullWidth>
          Got it
        </Button>
      </Modal>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.15)" />
      <path d="M7 12.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 36.4 27 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 40.5 16.2 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.4C41.7 35.6 45 30.4 45 24c0-1.4-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

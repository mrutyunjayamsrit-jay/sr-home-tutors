interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZES = { sm: 14, md: 20, lg: 28 };

export function Spinner({ size = "md", label = "Loading" }: SpinnerProps) {
  const px = SIZES[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      role="status"
      aria-label={label}
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

import { useEffect, useState } from "react";
import { MIN_CHECKOUT_GAP_MINUTES } from "./constants";

/**
 * Whether enough real time has passed since check-in to allow checking
 * out — mirrors the backend's own floor (attendance.service.ts
 * assertMinCheckoutGap), which is what actually enforces this; this hook
 * only drives the Check Out button's enabled state so a tutor isn't left
 * tapping a button that's guaranteed to be rejected. Re-evaluates every 15s
 * while still too early, so the button flips live without a page reload.
 */
export function useMinCheckoutGap(tutorCheckIn: string | null): { eligible: boolean; minutesRemaining: number } {
  const [now, setNow] = useState(() => Date.now());

  const elapsedMinutes = tutorCheckIn ? (now - new Date(tutorCheckIn).getTime()) / 60000 : 0;
  const eligible = !tutorCheckIn || elapsedMinutes >= MIN_CHECKOUT_GAP_MINUTES;

  useEffect(() => {
    if (eligible) return;
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, [eligible]);

  return { eligible, minutesRemaining: Math.max(0, Math.ceil(MIN_CHECKOUT_GAP_MINUTES - elapsedMinutes)) };
}

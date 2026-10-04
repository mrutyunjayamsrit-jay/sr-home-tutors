import { Button } from "@/components/ui";
import { useProximityStatus } from "./useProximityStatus";
import { useMinCheckoutGap } from "./useMinCheckoutGap";
import type { ClassSessionRow } from "./types";

/**
 * The quick-action button for a SCHEDULED class — "Check In" before the
 * tutor has arrived, "Check Out" once they have (tracked by
 * session.tutorCheckIn, not a separate status). Check In is enabled purely
 * by whether the tutor is confirmed near the student's home (see
 * useProximityStatus) — never a scheduled-time window, since real class
 * timing drifts too much for a fixed window to be useful. Check Out adds
 * one more gate on top of location: a real minimum gap since check-in (see
 * useMinCheckoutGap) — the backend enforces this authoritatively regardless,
 * this just keeps the button from inviting a tap that's guaranteed to fail.
 */
export function CheckInOutButton({ session, onClick }: { session: ClassSessionRow; onClick: () => void }) {
  const proximity = useProximityStatus(session);
  const mode = session.tutorCheckIn ? "check-out" : "check-in";
  const gap = useMinCheckoutGap(session.tutorCheckIn);

  const tooEarlyToCheckOut = mode === "check-out" && !gap.eligible;
  const disabled = proximity.state === "checking" || proximity.state === "out-of-range" || tooEarlyToCheckOut;

  const label =
    tooEarlyToCheckOut
      ? `Check Out in ${gap.minutesRemaining}m`
      : proximity.state === "checking"
        ? "Checking location…"
        : mode === "check-in"
          ? "Check In"
          : "Check Out";

  const title = tooEarlyToCheckOut
    ? `You can check out ${gap.minutesRemaining} minute${gap.minutesRemaining === 1 ? "" : "s"} from now`
    : proximity.state === "out-of-range"
      ? `You're ${proximity.distanceMeters}m from the student's home — move closer to ${mode === "check-in" ? "check in" : "check out"} here`
      : proximity.state === "checking"
        ? "Checking your location…"
        : undefined;

  return (
    <Button size="sm" disabled={disabled} title={title} onClick={onClick}>
      {label}
    </Button>
  );
}

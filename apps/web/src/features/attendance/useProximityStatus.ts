import { useProximityCheck } from "./api";
import { useDeviceLocation } from "./useDeviceLocation";
import type { ClassSessionRow } from "./types";

export type ProximityStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "in-range" }
  | { state: "out-of-range"; distanceMeters: number }
  | { state: "inconclusive" }; // permission denied, no fix, or parent has no location on file — button stays enabled, the dialog's manual-area fallback is the right next step

/**
 * Drives the Check In / Check Out buttons' enabled state: purely whether
 * the tutor is confirmed to be near the student's home — never a clock
 * window. A confirmed OUT_OF_RANGE reading disables the quick button (the
 * always-on row-click manual dialog remains available regardless);
 * anything inconclusive (no fix yet, permission denied, parent has no
 * location on file) leaves the button enabled so the dialog's own
 * manual-area fallback can take over.
 */
export function useProximityStatus(session: ClassSessionRow): ProximityStatus {
  const open = session.status === "SCHEDULED";
  const device = useDeviceLocation(open);
  const proximity = useProximityCheck(open ? session.id : undefined, device.status === "ready" ? device.coords : null);

  if (!open) return { state: "idle" };
  if (device.status === "error") return { state: "inconclusive" };
  if (device.status === "loading" || device.status === "idle") return { state: "checking" };
  if (proximity.isLoading) return { state: "checking" };
  if (proximity.isError || !proximity.data) return { state: "inconclusive" };

  switch (proximity.data.reason) {
    case "IN_RANGE":
      return { state: "in-range" };
    case "OUT_OF_RANGE":
      return { state: "out-of-range", distanceMeters: proximity.data.distanceMeters ?? 0 };
    default:
      // NO_PARENT_LOCATION / ALREADY_MARKED — neither should block the button; the dialog handles each appropriately.
      return { state: "inconclusive" };
  }
}

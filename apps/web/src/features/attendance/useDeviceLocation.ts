import { useEffect, useState } from "react";
import { getCurrentCoordinates, GeolocationRequestError, type Coordinates, type GeolocationErrorReason } from "@/lib/geolocation";

interface DeviceLocationState {
  status: "idle" | "loading" | "ready" | "error";
  coords: Coordinates | null;
  errorReason?: GeolocationErrorReason;
}

/**
 * One shared GPS fetch per page — used to silently pre-check proximity for
 * every "Mark attendance" button in view, rather than each row requesting
 * its own device fix (which would mean multiple simultaneous permission
 * prompts / hardware reads for a tutor with several classes today).
 *
 * `enabled` should only flip true when there's at least one session whose
 * button gating actually needs it — this still triggers the browser's
 * permission prompt if not already granted, so it's deliberately not
 * fetched on pages/times where no class is in its active-marking window.
 */
export function useDeviceLocation(enabled: boolean) {
  const [state, setState] = useState<DeviceLocationState>({ status: "idle", coords: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((s) => (s.status === "idle" ? { ...s, status: "loading" } : s));
    getCurrentCoordinates()
      .then((coords) => {
        if (!cancelled) setState({ status: "ready", coords });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", coords: null, errorReason: err instanceof GeolocationRequestError ? err.reason : undefined });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return state;
}

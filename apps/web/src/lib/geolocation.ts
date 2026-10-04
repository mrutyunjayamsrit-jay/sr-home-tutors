/**
 * Thin Promise wrapper around the browser Geolocation API, with the error
 * cases location-verified attendance actually needs to distinguish:
 * permission denied (needs a settings-guidance message, not a generic
 * retry), position unavailable (bad GPS fix), and timeout.
 */

export type GeolocationErrorReason = "UNSUPPORTED" | "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT";

export class GeolocationRequestError extends Error {
  constructor(public readonly reason: GeolocationErrorReason, message: string) {
    super(message);
    this.name = "GeolocationRequestError";
  }
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

const REASON_MESSAGE: Record<GeolocationErrorReason, string> = {
  UNSUPPORTED: "This browser doesn't support location access.",
  PERMISSION_DENIED: "Location permission was denied.",
  POSITION_UNAVAILABLE: "Couldn't get a GPS fix — try moving somewhere with a clearer view of the sky.",
  TIMEOUT: "Getting your location took too long.",
};

export function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new GeolocationRequestError("UNSUPPORTED", REASON_MESSAGE.UNSUPPORTED));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      (error) => {
        const reason: GeolocationErrorReason =
          error.code === error.PERMISSION_DENIED
            ? "PERMISSION_DENIED"
            : error.code === error.POSITION_UNAVAILABLE
              ? "POSITION_UNAVAILABLE"
              : "TIMEOUT";
        reject(new GeolocationRequestError(reason, REASON_MESSAGE[reason]));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

/**
 * Best-effort permission check via the Permissions API — not supported in
 * every browser (notably Safari's geolocation permission isn't queryable),
 * so callers should treat `null` as "unknown, just try getCurrentPosition
 * and handle the error" rather than as "denied".
 */
export async function queryGeolocationPermission(): Promise<PermissionState | null> {
  if (!("permissions" in navigator)) return null;
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state;
  } catch {
    return null;
  }
}

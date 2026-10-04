import { useState } from "react";
import { Card, Button, toast } from "@/components/ui";
import { useMyLocation, useUpdateMyLocation } from "./api";
import { getCurrentCoordinates, GeolocationRequestError } from "@/lib/geolocation";
import styles from "./LocationSetupCard.module.css";

/**
 * Self-service home-location capture — the input location-verified
 * attendance checks the tutor's GPS against (see attendance.service.ts
 * markWithLocation). Captured from the parent's own device at their own
 * home, so it's the most reliable source available, and can be refreshed
 * any time without needing the office involved.
 */
export function LocationSetupCard() {
  const { data, isLoading } = useMyLocation();
  const updateLocation = useUpdateMyLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSet = data?.latitude != null && data?.longitude != null;

  const handleShare = async () => {
    setError(null);
    setBusy(true);
    try {
      const coords = await getCurrentCoordinates();
      await updateLocation.mutateAsync({ latitude: coords.latitude, longitude: coords.longitude });
      toast.success("Home location saved — your tutor can now mark attendance on arrival");
    } catch (err) {
      if (err instanceof GeolocationRequestError) {
        setError(
          err.reason === "PERMISSION_DENIED"
            ? "Location permission was denied. Enable location for this site in your browser or device settings, then try again."
            : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : "Couldn't save your location — try again");
      }
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card className={styles.card}>
      <div>
        <h3 className={styles.title}>Location-based attendance</h3>
        {isSet ? (
          <>
            <p className={styles.statusRow}>
              <span aria-hidden="true">✓</span> Home location set
              {data?.locationUpdatedAt ? ` · updated ${new Date(data.locationUpdatedAt).toLocaleDateString()}` : ""}
            </p>
            <p className={styles.subtitle}>Your tutor can confirm they've arrived without you needing to be online.</p>
          </>
        ) : (
          <p className={styles.subtitle}>
            Let your tutor mark attendance just by being at your home — no need for you to be online at class time.
          </p>
        )}
        {error && <p className={styles.errorText}>{error}</p>}
      </div>
      <Button variant="secondary" onClick={handleShare} loading={busy}>
        {isSet ? "Update location" : "Share my location"}
      </Button>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Modal, Button, TextField, Spinner, toast } from "@/components/ui";
import { ApiError } from "@/lib/apiClient";
import { useCheckInLocation, useCheckInArea, useCheckOutLocation, useCheckOutArea } from "./api";
import { getCurrentCoordinates, GeolocationRequestError, type Coordinates } from "@/lib/geolocation";
import type { ClassSessionRow } from "./types";
import styles from "./CheckInOutDialog.module.css";

type Phase = "locating" | "location-ready" | "location-error" | "manual";

function errorReason(err: unknown): string | undefined {
  if (err instanceof ApiError && err.details && typeof err.details === "object" && "reason" in err.details) {
    return String((err.details as { reason?: unknown }).reason);
  }
  return undefined;
}

/**
 * Tutor check-in/check-out — location is the only automated path (the
 * tutor's own GPS, checked against the parent's home). When GPS isn't
 * available (permission denied, no fix, or the parent has no location on
 * file), the tutor can fall back to typing their current area, which gets
 * a lighter text-check against the address on file instead of a real
 * distance check (see attendance.service.ts). Which action this dialog
 * performs is inferred from the session itself — not yet checked in means
 * Check In, already checked in means Check Out — so the caller never has
 * to track that separately. Marking a class ABSENT_STUDENT is a separate,
 * less common outcome and stays on the row-click manual dialog instead.
 */
export function CheckInOutDialog({ session, onClose }: { session: ClassSessionRow | null; onClose: () => void }) {
  const checkInLocation = useCheckInLocation();
  const checkInArea = useCheckInArea();
  const checkOutLocation = useCheckOutLocation();
  const checkOutArea = useCheckOutArea();

  const mode = session?.tutorCheckIn ? "check-out" : "check-in";
  const actionLabel = mode === "check-in" ? "Check In" : "Check Out";
  const locationMutation = mode === "check-in" ? checkInLocation : checkOutLocation;
  const areaMutation = mode === "check-in" ? checkInArea : checkOutArea;

  const [phase, setPhase] = useState<Phase>("locating");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);

  const [area, setArea] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [manualNotice, setManualNotice] = useState<string | null>(null);

  const requestLocation = async () => {
    setPhase("locating");
    setLocationErrorMessage(null);
    try {
      const position = await getCurrentCoordinates();
      setCoords(position);
      setPhase("location-ready");
    } catch (err) {
      const message =
        err instanceof GeolocationRequestError
          ? err.reason === "PERMISSION_DENIED"
            ? "Location permission was denied. Enable location for this site in your browser or device settings, then try again."
            : err.message
          : "Couldn't get your location — try again";
      setLocationErrorMessage(message);
      setPhase("location-error");
    }
  };

  const switchToManual = (notice?: string) => {
    setManualNotice(notice ?? null);
    setManualError(null);
    setMismatch(null);
    setPhase("manual");
  };

  useEffect(() => {
    if (session) {
      setCoords(null);
      setArea("");
      setManualError(null);
      setMismatch(null);
      setManualNotice(null);
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const handleClose = () => {
    setPhase("locating");
    onClose();
  };

  const handleByLocation = async () => {
    if (!session || !coords) return;
    try {
      await locationMutation.mutateAsync({ id: session.id, latitude: coords.latitude, longitude: coords.longitude });
      toast.success(mode === "check-in" ? "Checked in — verified by location" : "Checked out — verified by location");
      handleClose();
    } catch (err) {
      const reason = errorReason(err);
      if (reason === "NO_PARENT_LOCATION") {
        switchToManual("The parent hasn't set a home location yet — enter your current area instead.");
        return;
      }
      setLocationErrorMessage(err instanceof Error ? err.message : `Couldn't ${mode === "check-in" ? "check in" : "check out"}`);
      setPhase("location-error");
    }
  };

  const submitArea = async (confirmMismatch: boolean) => {
    if (!session) return;
    try {
      await areaMutation.mutateAsync({ id: session.id, area, confirmMismatch });
      toast.success(mode === "check-in" ? "Checked in" : "Checked out");
      handleClose();
    } catch (err) {
      if (errorReason(err) === "AREA_MISMATCH" && err instanceof Error) {
        setMismatch(err.message);
        return;
      }
      setManualError(err instanceof Error ? err.message : `Couldn't ${mode === "check-in" ? "check in" : "check out"}`);
    }
  };

  const handleByArea = async () => {
    setManualError(null);
    setMismatch(null);
    if (area.trim().length < 2) {
      setManualError("Enter your current area first");
      return;
    }
    await submitArea(false);
  };

  if (!session) return null;
  const isPending = locationMutation.isPending || areaMutation.isPending;

  return (
    <Modal open={Boolean(session)} onClose={handleClose} title={actionLabel}>
      <p className={styles.meta}>
        {session.assignment.student.name} · {session.assignment.subjects.join(", ")} ·{" "}
        {new Date(session.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>

      {phase === "locating" && (
        <div className={styles.locating}>
          <Spinner size="lg" />
          <p className={styles.locatingText}>Getting your location…</p>
        </div>
      )}

      {phase === "location-error" && (
        <>
          <div className={styles.errorBox}>{locationErrorMessage}</div>
          <Button fullWidth onClick={requestLocation}>
            Try again
          </Button>
          <div className={styles.linkRow}>
            <button type="button" className={styles.linkButton} onClick={() => switchToManual()}>
              Enter my area instead
            </button>
          </div>
        </>
      )}

      {phase === "location-ready" && coords && (
        <>
          {coords.accuracyMeters > 100 && (
            <p className={styles.accuracy}>
              GPS accuracy is ±{Math.round(coords.accuracyMeters)}m — if this fails, try again somewhere with a clearer sky view.
            </p>
          )}
          {locationErrorMessage && <div className={styles.errorBox}>{locationErrorMessage}</div>}
          <Button fullWidth onClick={handleByLocation} loading={isPending}>
            {actionLabel}
          </Button>
          <div className={styles.linkRow}>
            <button type="button" className={styles.linkButton} onClick={() => switchToManual()}>
              Enter my area instead
            </button>
          </div>
        </>
      )}

      {phase === "manual" && (
        <>
          {manualNotice && <p className={styles.locatingText} style={{ marginBottom: 12 }}>{manualNotice}</p>}

          {mismatch ? (
            <>
              <div className={styles.errorBox}>{mismatch}</div>
              <div className={styles.choiceRow}>
                <Button variant="secondary" onClick={() => setMismatch(null)}>
                  Go back
                </Button>
                <Button onClick={() => submitArea(true)} loading={isPending}>
                  {actionLabel} anyway
                </Button>
              </div>
            </>
          ) : (
            <>
              <TextField
                label="Your current area / locality"
                placeholder="e.g. Indiranagar, near the park"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                error={manualError ?? undefined}
                autoFocus
              />
              <div style={{ marginTop: 12 }}>
                <Button fullWidth onClick={handleByArea} loading={isPending}>
                  {actionLabel}
                </Button>
              </div>
              <div className={styles.linkRow}>
                <button type="button" className={styles.linkButton} onClick={requestLocation}>
                  Try location again instead
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

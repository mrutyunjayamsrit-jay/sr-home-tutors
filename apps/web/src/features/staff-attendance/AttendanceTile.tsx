import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, TextField, Badge, toast } from "@/components/ui";
import { useCheckIn, useCheckOut, useTodayAttendance } from "./api";
import { MIN_CHECKOUT_GAP_MINUTES, combineTodayTime } from "./constants";

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Compact check-in/check-out tile for the Branch Admin dashboard — the
 * full picker, edit, and history table live at /branch/my-attendance
 * (see BranchAttendancePage.tsx); this tile is just the "do it right now"
 * shortcut so attendance doesn't require leaving the dashboard.
 */
export function AttendanceTile() {
  const today = useTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [checkInTime, setCheckInTime] = useState(nowHHMM);
  const [checkOutTime, setCheckOutTime] = useState(nowHHMM);

  const record = today.data ?? null;
  const hasCheckedIn = Boolean(record?.loginAt);
  const hasCheckedOut = Boolean(record?.logoutAt);

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync({ at: combineTodayTime(checkInTime).toISOString() });
      toast.success("Checked in for today");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check in");
    }
  };

  const handleCheckOut = async () => {
    if (record?.loginAt) {
      const elapsedMinutes = (combineTodayTime(checkOutTime).getTime() - new Date(record.loginAt).getTime()) / 60000;
      if (elapsedMinutes < MIN_CHECKOUT_GAP_MINUTES) {
        toast.error(`Check-out must be at least ${MIN_CHECKOUT_GAP_MINUTES} minutes after check-in`);
        return;
      }
    }
    try {
      await checkOut.mutateAsync({ at: combineTodayTime(checkOutTime).toISOString() });
      toast.success("Checked out for today");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check out");
    }
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>My Attendance</h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {hasCheckedIn && hasCheckedOut && <Badge tone="success">Day complete</Badge>}
        {hasCheckedIn && !hasCheckedOut && <Badge tone="warning">Checked in</Badge>}
        {!hasCheckedIn && !today.isLoading && <Badge tone="danger">Not checked in</Badge>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-5)" }}>
        <div>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>Check-in</span>
          {hasCheckedIn ? (
            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xl)", fontWeight: 700 }}>{formatTime(record?.loginAt)}</p>
          ) : (
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end", marginTop: "var(--space-2)" }}>
              <TextField label="Time" type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
              <Button onClick={handleCheckIn} loading={checkIn.isPending}>
                Check In
              </Button>
            </div>
          )}
        </div>

        <div>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>Check-out</span>
          {hasCheckedOut ? (
            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xl)", fontWeight: 700 }}>{formatTime(record?.logoutAt)}</p>
          ) : hasCheckedIn ? (
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end", marginTop: "var(--space-2)" }}>
              <TextField label="Time" type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
              <Button onClick={handleCheckOut} loading={checkOut.isPending}>
                Check Out
              </Button>
            </div>
          ) : (
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", marginTop: "var(--space-2)" }}>Check in first</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <Link to="/branch/my-attendance" style={{ fontSize: "var(--text-sm)" }}>
          Edit times or view history →
        </Link>
      </div>
    </Card>
  );
}

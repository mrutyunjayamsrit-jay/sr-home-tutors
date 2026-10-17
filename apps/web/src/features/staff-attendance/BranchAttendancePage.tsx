import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Card, Button, TextField, DataTable, Badge, Alert, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useCheckIn, useCheckOut, useMyAttendanceHistory, useTodayAttendance } from "./api";
import { MIN_CHECKOUT_GAP_MINUTES, combineTodayTime } from "./constants";
import type { StaffAttendanceRecord, StaffAttendanceStatus } from "./types";

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const STATUS_TONE: Record<StaffAttendanceStatus, "neutral" | "success" | "danger" | "warning"> = {
  PRESENT: "success",
  ABSENT: "danger",
  HALF_DAY: "warning",
  LEAVE: "neutral",
};

export function BranchAttendancePage() {
  const today = useTodayAttendance();
  const history = useMyAttendanceHistory();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [checkInTime, setCheckInTime] = useState(nowHHMM);
  const [checkOutTime, setCheckOutTime] = useState(nowHHMM);
  const [editingIn, setEditingIn] = useState(false);
  const [editingOut, setEditingOut] = useState(false);

  const record = today.data ?? null;
  const hasCheckedIn = Boolean(record?.loginAt);
  const hasCheckedOut = Boolean(record?.logoutAt);

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync({ at: combineTodayTime(checkInTime).toISOString() });
      toast.success("Checked in for today");
      setEditingIn(false);
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
      setEditingOut(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check out");
    }
  };

  const columns: Column<StaffAttendanceRecord>[] = [
    {
      key: "date",
      header: "Date",
      render: (r) => new Date(r.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
    },
    { key: "loginAt", header: "Check-in", render: (r) => formatTime(r.loginAt) },
    { key: "logoutAt", header: "Check-out", render: (r) => formatTime(r.logoutAt) },
    { key: "status", header: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status.replace("_", " ")}</Badge> },
  ];

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <h1 style={{ marginTop: 0 }}>My Attendance</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "-8px" }}>
          Check in when you arrive at the branch, and check out before you leave.
        </p>

        {!today.isLoading && !hasCheckedIn && (
          <div style={{ margin: "var(--space-4) 0" }}>
            <Alert variant="warning">You haven't checked in today yet — mark your attendance below.</Alert>
          </div>
        )}

        <Card style={{ margin: "var(--space-4) 0 var(--space-6)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)" }}>
            Today · {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-6)" }}>
            <div>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>Check-in</span>
              {hasCheckedIn && !editingIn ? (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                  <strong style={{ fontSize: "var(--text-xl)" }}>{formatTime(record?.loginAt)}</strong>
                  <Button variant="ghost" size="sm" onClick={() => setEditingIn(true)}>
                    Edit
                  </Button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", marginTop: "var(--space-2)" }}>
                  <TextField
                    label="Time"
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                  <Button onClick={handleCheckIn} loading={checkIn.isPending}>
                    Check In
                  </Button>
                </div>
              )}
            </div>

            <div>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>Check-out</span>
              {hasCheckedOut && !editingOut ? (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                  <strong style={{ fontSize: "var(--text-xl)" }}>{formatTime(record?.logoutAt)}</strong>
                  <Button variant="ghost" size="sm" onClick={() => setEditingOut(true)}>
                    Edit
                  </Button>
                </div>
              ) : hasCheckedIn ? (
                <div style={{ marginTop: "var(--space-2)" }}>
                  <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
                    <TextField
                      label="Time"
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                    />
                    <Button onClick={handleCheckOut} loading={checkOut.isPending}>
                      Check Out
                    </Button>
                  </div>
                  <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                    Must be at least {MIN_CHECKOUT_GAP_MINUTES} minutes after check-in ({formatTime(record?.loginAt)}).
                  </p>
                </div>
              ) : (
                <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", marginTop: "var(--space-2)" }}>
                  Check in first
                </p>
              )}
            </div>
          </div>
        </Card>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Recent history</h2>
        <DataTable
          columns={columns}
          rows={history.data ?? []}
          rowKey={(r) => r.id}
          isLoading={history.isLoading}
          emptyTitle="No attendance recorded yet"
        />
      </div>
    </AppShell>
  );
}

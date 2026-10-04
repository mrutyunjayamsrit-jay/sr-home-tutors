import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useMarkSession } from "./api";
import { MIN_CHECKOUT_GAP_MINUTES } from "./constants";
import type { ClassSessionRow } from "./types";

const STATUS_OPTIONS = [
  { value: "COMPLETED", label: "Completed" },
  { value: "ABSENT_STUDENT", label: "Student absent" },
  { value: "ABSENT_TUTOR", label: "Tutor absent" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
// A native <input type="time"> submits "" when left blank, not undefined —
// both "leave it out" and "a real HH:mm" are valid; anything else isn't.
const timeField = z.union([z.literal(""), z.string().regex(TIME_RE, "Use 24h HH:mm")]).optional();

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

const schema = z
  .object({
    status: z.enum(["COMPLETED", "ABSENT_STUDENT", "ABSENT_TUTOR", "CANCELLED"]),
    checkIn: timeField,
    checkOut: timeField,
    chaptersCovered: z.string().optional(),
    topicsCovered: z.string().optional(),
  })
  .refine((v) => !v.checkIn || !v.checkOut || toMinutes(v.checkOut) > toMinutes(v.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  })
  .refine((v) => !v.checkIn || !v.checkOut || toMinutes(v.checkOut) - toMinutes(v.checkIn) >= MIN_CHECKOUT_GAP_MINUTES, {
    message: `Check-out must be at least ${MIN_CHECKOUT_GAP_MINUTES} minutes after check-in`,
    path: ["checkOut"],
  });
type FormValues = z.infer<typeof schema>;

function combine(dateISO: string, hhmm: string | undefined): string | undefined {
  if (!hhmm) return undefined;
  const date = new Date(dateISO);
  const [h, m] = hhmm.split(":").map(Number);
  date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date.toISOString();
}

export function MarkSessionDialog({ session, onClose }: { session: ClassSessionRow | null; onClose: () => void }) {
  const markSession = useMarkSession();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { status: "COMPLETED" } });

  const status = watch("status");

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    if (!session) return;
    try {
      await markSession.mutateAsync({
        id: session.id,
        input: {
          status: values.status,
          tutorCheckIn: combine(session.scheduledDate, values.checkIn),
          tutorCheckOut: combine(session.scheduledDate, values.checkOut),
          chaptersCovered: values.chaptersCovered || undefined,
          topicsCovered: values.topicsCovered || undefined,
        },
      });
      toast.success("Attendance recorded");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record attendance");
    }
  };

  if (!session) return null;

  return (
    <Modal open={Boolean(session)} onClose={handleClose} title={`${session.assignment.student.name} · ${session.assignment.tutor.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          Scheduled {new Date(session.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
          {new Date(session.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {session.assignment.subjects.join(", ")}
        </p>
        <Select label="Status" options={STATUS_OPTIONS} {...register("status")} />
        {status === "COMPLETED" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <TextField label="Check-in (optional)" type="time" error={errors.checkIn?.message} {...register("checkIn")} />
              <TextField label="Check-out (optional)" type="time" error={errors.checkOut?.message} {...register("checkOut")} />
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
              Leave blank to credit the full scheduled duration. If both are set, check-out must be at least {MIN_CHECKOUT_GAP_MINUTES} minutes after
              check-in.
            </p>
            <TextField label="Chapters covered" {...register("chaptersCovered")} />
            <TextField label="Topics covered" {...register("topicsCovered")} />
          </>
        )}
        {errors.status && <p style={{ color: "var(--color-danger-500)", fontSize: "var(--text-xs)" }}>{errors.status.message}</p>}
        <Button type="submit" loading={markSession.isPending} fullWidth>
          Save attendance
        </Button>
      </form>
    </Modal>
  );
}

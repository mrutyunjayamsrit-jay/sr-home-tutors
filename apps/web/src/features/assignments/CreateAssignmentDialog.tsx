import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useCreateAssignment } from "./api";
import { useAllTutors, useAllParents } from "@/features/registration/api";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const splitCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

const schema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  tutorId: z.string().min(1, "Choose a tutor"),
  subjects: z.string().min(1, "Required"),
  perClassRate: z.string().min(1, "Required"),
  fixedClassesPerMonth: z.string().min(1, "Required"),
  classDurationMinutes: z.string().min(1, "Required"),
  daysOfWeek: z.array(z.number()).min(1, "Select at least one day"),
  timeSlotStart: z.string().min(1, "Required"),
  timeSlotEnd: z.string().min(1, "Required"),
  startDate: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

export function CreateAssignmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createAssignment = useCreateAssignment();
  const { data: tutorsData } = useAllTutors();
  const { data: parentsData } = useAllParents();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { daysOfWeek: [], startDate: new Date().toISOString().slice(0, 10) },
  });

  const selectedDays = watch("daysOfWeek") ?? [];
  const toggleDay = (d: number) => {
    setValue("daysOfWeek", selectedDays.includes(d) ? selectedDays.filter((x) => x !== d) : [...selectedDays, d].sort(), {
      shouldValidate: true,
    });
  };

  const genderTag = (g: string | null) => (g === "MALE" ? " · M" : g === "FEMALE" ? " · F" : g === "OTHER" ? " · Other" : "");

  const tutorOptions = (tutorsData?.data ?? []).map((t) => ({
    value: t.id,
    label: `${t.name}${genderTag(t.gender)} — ${t.subjects.join(", ") || "no subjects listed"}`,
  }));
  const studentOptions = (parentsData?.data ?? []).flatMap((p) =>
    p.students.map((s) => ({
      value: s.id,
      label: `${s.name} (Class ${s.studentClass}) — parent: ${p.name}${s.preferredTutorGender ? ` (prefers ${s.preferredTutorGender.toLowerCase()} tutor)` : ""}`,
    })),
  );

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createAssignment.mutateAsync({
        studentId: values.studentId,
        tutorId: values.tutorId,
        subjects: splitCsv(values.subjects),
        perClassRate: Number(values.perClassRate),
        fixedClassesPerMonth: Number(values.fixedClassesPerMonth),
        classDurationMinutes: Number(values.classDurationMinutes),
        daysOfWeek: values.daysOfWeek,
        timeSlotStart: values.timeSlotStart,
        timeSlotEnd: values.timeSlotEnd,
        startDate: values.startDate,
      });
      toast.success("Tutor assigned — class schedule generated");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create assignment");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Assign a tutor">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <Select
          label="Student"
          placeholder={studentOptions.length ? "Choose a student" : "No registered students yet"}
          options={studentOptions}
          error={errors.studentId?.message}
          {...register("studentId")}
        />
        <Select
          label="Tutor"
          placeholder={tutorOptions.length ? "Choose a tutor" : "No registered tutors yet"}
          options={tutorOptions}
          error={errors.tutorId?.message}
          {...register("tutorId")}
        />
        <TextField label="Subjects" hint="Comma-separated" error={errors.subjects?.message} {...register("subjects")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <TextField label="Rate per class (₹)" type="number" step="0.01" error={errors.perClassRate?.message} {...register("perClassRate")} />
          <TextField label="Fixed classes / month" type="number" error={errors.fixedClassesPerMonth?.message} {...register("fixedClassesPerMonth")} />
        </div>
        <TextField label="Class duration (minutes)" type="number" error={errors.classDurationMinutes?.message} {...register("classDurationMinutes")} />

        <div>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>Days assigned</span>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-strong)",
                  background: selectedDays.includes(d.value) ? "var(--color-primary-600)" : "var(--bg-surface)",
                  color: selectedDays.includes(d.value) ? "#fff" : "var(--text-primary)",
                  fontSize: "var(--text-xs)",
                  cursor: "pointer",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          {errors.daysOfWeek && <p style={{ color: "var(--color-danger-500)", fontSize: "var(--text-xs)", margin: "4px 0 0" }}>{errors.daysOfWeek.message}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <TextField label="Start time" type="time" error={errors.timeSlotStart?.message} {...register("timeSlotStart")} />
          <TextField label="End time" type="time" error={errors.timeSlotEnd?.message} {...register("timeSlotEnd")} />
        </div>
        <TextField label="Class start date" type="date" error={errors.startDate?.message} {...register("startDate")} />

        <Button type="submit" loading={createAssignment.isPending} fullWidth>
          Assign tutor
        </Button>
      </form>
    </Modal>
  );
}

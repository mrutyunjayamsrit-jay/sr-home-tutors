import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, toast } from "@/components/ui";
import { useCreateTestResult } from "./api";
import { useAssignments } from "@/features/assignments/api";

const schema = z.object({
  assignmentId: z.string().min(1, "Choose a student"),
  subject: z.string().min(1, "Required"),
  topic: z.string().min(1, "Required"),
  totalMarks: z.string().min(1, "Required"),
  obtainedMarks: z.string().min(1, "Required"),
  testDate: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

export function CreateTestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createTest = useCreateTestResult();
  const { data: assignmentsData } = useAssignments({ page: 1, pageSize: 100 });
  const studentOptions = (assignmentsData?.data ?? []).map((a) => ({
    value: a.id,
    label: `${a.student.name} (Class ${a.student.studentClass}) — ${a.subjects.join(", ")}`,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { testDate: new Date().toISOString().slice(0, 10) } });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createTest.mutateAsync({
        assignmentId: values.assignmentId,
        subject: values.subject,
        topic: values.topic,
        totalMarks: Number(values.totalMarks),
        obtainedMarks: Number(values.obtainedMarks),
        testDate: values.testDate,
      });
      toast.success("Test result saved");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save test result");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New test result">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <Select
          label="Student"
          placeholder={studentOptions.length ? "Choose a student" : "No students assigned yet"}
          options={studentOptions}
          error={errors.assignmentId?.message}
          {...register("assignmentId")}
        />
        <TextField label="Subject" error={errors.subject?.message} {...register("subject")} />
        <TextField label="Topic" error={errors.topic?.message} {...register("topic")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <TextField label="Total marks" type="number" step="0.01" error={errors.totalMarks?.message} {...register("totalMarks")} />
          <TextField label="Obtained marks" type="number" step="0.01" error={errors.obtainedMarks?.message} {...register("obtainedMarks")} />
        </div>
        <TextField label="Test date" type="date" error={errors.testDate?.message} {...register("testDate")} />
        <Button type="submit" loading={createTest.isPending} fullWidth>
          Save test result
        </Button>
      </form>
    </Modal>
  );
}

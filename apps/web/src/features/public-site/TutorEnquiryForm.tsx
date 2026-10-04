import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, TextField, Select, MultiSelectDropdown, Checkbox, Alert } from "@/components/ui";
import { usePublicAreas, usePublicBranches, usePublicSubjects, useSubmitTutorEnquiry } from "./api";
import type { Gender, TeachCategory } from "./types";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];
const CATEGORY_OPTIONS = [
  { value: "PRIMARY", label: "Primary" },
  { value: "HIGHSCHOOL", label: "High School" },
  { value: "COLLEGE", label: "College" },
  { value: "DEGREE", label: "Degree" },
];

const schema = z.object({
  branchId: z.string().min(1, "Choose your nearest branch"),
  name: z.string().min(2, "Enter your name"),
  gender: z.string().min(1, "Choose a gender"),
  education: z.string().min(1, "e.g. B.Ed, M.Sc. Physics"),
  contactNumber: z.string().min(6, "Enter a valid phone number").max(20),
  presentAddress: z.string().min(1, "Required"),
  ownsVehicle: z.boolean(),
  categories: z.array(z.string()).min(1, "Choose at least one category"),
  subjectsInterested: z.array(z.string()).default([]),
  areasInterested: z.array(z.string()).default([]),
  notes: z.string().optional(),
  companyWebsite: z.string().max(0).optional(),
});
type FormValues = z.infer<typeof schema>;

export function TutorEnquiryForm() {
  const branches = usePublicBranches();
  const subjects = usePublicSubjects();
  const submit = useSubmitTutorEnquiry();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ownsVehicle: false, categories: [], subjectsInterested: [], areasInterested: [] },
  });

  const selectedCategories = watch("categories") ?? [];
  const selectedSubjects = watch("subjectsInterested") ?? [];
  const selectedAreas = watch("areasInterested") ?? [];
  const selectedBranchId = watch("branchId");
  const areas = usePublicAreas(selectedBranchId || undefined);
  const branchOptions = (branches.data ?? []).map((b) => ({ value: b.id, label: b.name }));
  const subjectOptions = (subjects.data ?? []).map((s) => ({ value: s.name, label: s.name }));
  const areaOptions = (areas.data ?? []).map((a) => ({ value: a.name, label: a.name }));

  const onSubmit = async (values: FormValues) => {
    await submit.mutateAsync({
      branchId: values.branchId,
      name: values.name,
      gender: values.gender as Gender,
      education: values.education,
      contactNumber: values.contactNumber,
      presentAddress: values.presentAddress,
      ownsVehicle: values.ownsVehicle,
      categories: values.categories as TeachCategory[],
      subjectsInterested: values.subjectsInterested,
      areasInterested: values.areasInterested,
      notes: values.notes || undefined,
    });
    reset();
  };

  if (submit.isSuccess) {
    return (
      <Alert variant="success">
        <strong>Thank you for applying!</strong> Our team will review your profile and reach out within a few days.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
      {submit.isError && <Alert variant="danger">{submit.error?.message || "Something went wrong — please try again."}</Alert>}

      <Select
        label="Nearest branch"
        placeholder={branches.isLoading ? "Loading branches…" : "Choose a branch"}
        options={branchOptions}
        error={errors.branchId?.message}
        {...register("branchId", { onChange: () => setValue("areasInterested", []) })}
      />
      <TextField label="Your name" error={errors.name?.message} {...register("name")} />
      <Select label="Gender" placeholder="Choose gender" options={GENDER_OPTIONS} error={errors.gender?.message} {...register("gender")} />
      <TextField label="Education" hint="e.g. B.Ed, M.Sc. Physics" error={errors.education?.message} {...register("education")} />
      <TextField label="Phone number" error={errors.contactNumber?.message} {...register("contactNumber")} />
      <MultiSelectDropdown
        label="I'd like to teach"
        placeholder="Choose categories"
        options={CATEGORY_OPTIONS}
        value={selectedCategories}
        onChange={(next) => setValue("categories", next, { shouldValidate: true })}
        error={errors.categories?.message}
      />
      <MultiSelectDropdown
        label="Subjects you can teach"
        placeholder="Choose subjects"
        options={subjectOptions}
        value={selectedSubjects}
        onChange={(next) => setValue("subjectsInterested", next)}
        error={errors.subjectsInterested?.message}
      />
      <MultiSelectDropdown
        label="Areas you can travel to"
        placeholder={selectedBranchId ? "Choose areas" : "Choose a branch first"}
        options={areaOptions}
        value={selectedAreas}
        onChange={(next) => setValue("areasInterested", next)}
        error={errors.areasInterested?.message}
      />
      <TextField label="Your address" error={errors.presentAddress?.message} {...register("presentAddress")} />
      <Checkbox label="I own a vehicle" {...register("ownsVehicle")} />
      <TextField label="Anything else about you?" error={errors.notes?.message} {...register("notes")} />

      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Company website
          <input type="text" tabIndex={-1} autoComplete="off" {...register("companyWebsite")} />
        </label>
      </div>

      <Button type="submit" loading={submit.isPending} fullWidth size="lg">
        Apply to teach
      </Button>
    </form>
  );
}

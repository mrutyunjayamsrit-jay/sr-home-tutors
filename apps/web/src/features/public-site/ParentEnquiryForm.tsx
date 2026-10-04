import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, TextField, Select, MultiSelectDropdown, Alert } from "@/components/ui";
import { usePublicAreas, usePublicBranches, usePublicSubjects } from "./api";
import { useSubmitParentEnquiry } from "./api";
import { getCurrentCoordinates, GeolocationRequestError, type Coordinates } from "@/lib/geolocation";
import { STUDENT_CATEGORY_OPTIONS, getClassOptions } from "@/lib/studentCategoryOptions";
import type { Board, Gender } from "./types";

const BOARD_OPTIONS = [
  { value: "STATE", label: "State Board" },
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "OTHER", label: "Other" },
];
const PREFERRED_GENDER_OPTIONS = [
  { value: "MALE", label: "Male tutor" },
  { value: "FEMALE", label: "Female tutor" },
  { value: "OTHER", label: "Other" },
];

const schema = z.object({
  branchId: z.string().min(1, "Choose your nearest branch"),
  studentName: z.string().min(2, "Enter your child's name"),
  contactNumber: z.string().min(6, "Enter a valid phone number").max(20),
  category: z.string().min(1, "Choose a category"),
  studentClass: z.string().min(1, "Choose a class"),
  board: z.string().min(1, "Choose a board"),
  subjectsRequired: z.array(z.string()).default([]),
  presentAddress: z.string().min(1, "Required"),
  area: z.string().optional(),
  preferredTutorGender: z.string().optional(),
  parentQueries: z.string().optional(),
  // Honeypot — real visitors never see this field (visually hidden below).
  companyWebsite: z.string().max(0).optional(),
});
type FormValues = z.infer<typeof schema>;

export function ParentEnquiryForm() {
  const branches = usePublicBranches();
  const subjects = usePublicSubjects();
  const submit = useSubmitParentEnquiry();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { subjectsRequired: [] } });

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const selectedCategory = watch("category");
  const selectedSubjects = watch("subjectsRequired") ?? [];
  const selectedBranchId = watch("branchId");
  const areas = usePublicAreas(selectedBranchId || undefined);
  const classOptions = getClassOptions(selectedCategory);
  const branchOptions = (branches.data ?? []).map((b) => ({ value: b.id, label: b.name }));
  const subjectOptions = (subjects.data ?? []).map((s) => ({ value: s.name, label: s.name }));
  const areaOptions = (areas.data ?? []).map((a) => ({ value: a.name, label: a.name }));

  const handleShareLocation = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      setCoords(await getCurrentCoordinates());
    } catch (err) {
      setLocationError(err instanceof GeolocationRequestError ? err.message : "Couldn't get your location");
    } finally {
      setLocating(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    await submit.mutateAsync({
      branchId: values.branchId,
      studentName: values.studentName,
      contactNumber: values.contactNumber,
      studentClass: values.studentClass,
      board: values.board as Board,
      subjectsRequired: values.subjectsRequired,
      presentAddress: values.presentAddress,
      area: values.area || undefined,
      preferredTutorGender: (values.preferredTutorGender || undefined) as Gender | undefined,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      parentQueries: values.parentQueries || undefined,
    });
    reset();
    setCoords(null);
  };

  if (submit.isSuccess) {
    return (
      <Alert variant="success">
        <strong>Thank you!</strong> We've received your enquiry and a member of our team will call you within 1–2 working days.
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
        {...register("branchId", { onChange: () => setValue("area", "") })}
      />
      <TextField label="Child's name" error={errors.studentName?.message} {...register("studentName")} />
      <TextField label="Your phone number" error={errors.contactNumber?.message} {...register("contactNumber")} />
      <Select
        label="Category"
        placeholder="Choose a category"
        options={STUDENT_CATEGORY_OPTIONS}
        error={errors.category?.message}
        {...register("category", { onChange: () => setValue("studentClass", "") })}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Select
          label="Class"
          placeholder={selectedCategory ? "Choose a class" : "Choose a category first"}
          options={classOptions}
          error={errors.studentClass?.message}
          disabled={!selectedCategory}
          {...register("studentClass")}
        />
        <Select label="Board" placeholder="Choose" options={BOARD_OPTIONS} error={errors.board?.message} {...register("board")} />
      </div>
      <MultiSelectDropdown
        label="Subjects needed"
        placeholder="Choose subjects"
        options={subjectOptions}
        value={selectedSubjects}
        onChange={(next) => setValue("subjectsRequired", next)}
        error={errors.subjectsRequired?.message}
      />
      <TextField label="Your address" error={errors.presentAddress?.message} {...register("presentAddress")} />
      <Select
        label="Area"
        placeholder={!selectedBranchId ? "Choose a branch first" : areaOptions.length ? "Choose your area (optional)" : "No areas added for this branch yet"}
        options={areaOptions}
        disabled={!selectedBranchId || areaOptions.length === 0}
        {...register("area")}
      />
      <Select
        label="Preferred tutor gender"
        placeholder="No preference"
        options={PREFERRED_GENDER_OPTIONS}
        {...register("preferredTutorGender")}
      />

      <div>
        <Button type="button" variant="secondary" size="sm" onClick={handleShareLocation} loading={locating}>
          {coords ? "📍 Location shared" : "Share my location (optional)"}
        </Button>
        <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          {coords
            ? "Your tutor will be able to confirm arrival at your home automatically once you're enrolled."
            : "Helps your assigned tutor mark attendance without needing you online — you can also add this later."}
        </p>
        {locationError && <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--color-danger-500)" }}>{locationError}</p>}
      </div>

      <TextField label="Anything else we should know?" error={errors.parentQueries?.message} {...register("parentQueries")} />

      {/* Honeypot: visually hidden from real visitors, off-screen rather than display:none so lazier bots still fill it in. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Company website
          <input type="text" tabIndex={-1} autoComplete="off" {...register("companyWebsite")} />
        </label>
      </div>

      <Button type="submit" loading={submit.isPending} fullWidth size="lg">
        Request a tutor
      </Button>
    </form>
  );
}

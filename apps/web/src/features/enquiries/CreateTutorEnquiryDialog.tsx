import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, MultiSelectDropdown, Checkbox, toast } from "@/components/ui";
import { useCreateTutorEnquiry } from "./api";
import { useSubjects, useAreas } from "@/features/master-data/api";
import { useAuthStore } from "@/features/auth/authStore";
import type { AddressProofType, Gender, TeachCategory } from "./types";

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
const ADDRESS_PROOF_OPTIONS = [
  { value: "AADHAR", label: "Aadhar" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "PASSPORT", label: "Passport" },
  { value: "OTHER", label: "Other" },
];

const schema = z.object({
  name: z.string().min(2, "Required"),
  gender: z.string().min(1, "Choose a gender"),
  education: z.string().min(1, "Required"),
  contactNumber: z.string().min(6, "Required"),
  presentAddress: z.string().min(1, "Required"),
  permanentAddress: z.string().optional(),
  ownsVehicle: z.boolean(),
  addressProofType: z.string().optional(),
  categories: z.array(z.string()).min(1, "Choose at least one category"),
  subjectsInterested: z.array(z.string()).default([]),
  areasInterested: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateTutorEnquiryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createEnquiry = useCreateTutorEnquiry();
  const user = useAuthStore((s) => s.user);
  const subjects = useSubjects();
  const areas = useAreas({ branchId: user?.branchId ?? undefined });
  const subjectOptions = (subjects.data ?? []).map((s) => ({ value: s.name, label: s.name }));
  const areaOptions = (areas.data ?? []).map((a) => ({ value: a.name, label: a.name }));

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

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createEnquiry.mutateAsync({
        name: values.name,
        gender: values.gender as Gender,
        education: values.education,
        contactNumber: values.contactNumber,
        presentAddress: values.presentAddress,
        permanentAddress: values.permanentAddress || undefined,
        ownsVehicle: values.ownsVehicle,
        addressProofType: (values.addressProofType || undefined) as AddressProofType | undefined,
        categories: values.categories as TeachCategory[],
        subjectsInterested: values.subjectsInterested,
        areasInterested: values.areasInterested,
        notes: values.notes || undefined,
      });
      toast.success(`Tutor enquiry for ${values.name} added`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save enquiry");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New tutor enquiry">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <TextField label="Name of the tutor" error={errors.name?.message} {...register("name")} />
        <Select label="Gender" placeholder="Choose gender" options={GENDER_OPTIONS} error={errors.gender?.message} {...register("gender")} />
        <TextField label="Education" hint="e.g. B.Ed, M.Sc. Physics" error={errors.education?.message} {...register("education")} />
        <TextField label="Contact number" error={errors.contactNumber?.message} {...register("contactNumber")} />
        <Checkbox label="Owns a vehicle" {...register("ownsVehicle")} />
        <TextField label="Present address" error={errors.presentAddress?.message} {...register("presentAddress")} />
        <TextField label="Permanent address" error={errors.permanentAddress?.message} {...register("permanentAddress")} />
        <Select
          label="Address proof type"
          placeholder="Select (optional)"
          options={ADDRESS_PROOF_OPTIONS}
          {...register("addressProofType")}
        />
        <MultiSelectDropdown
          label="Interested to teach"
          placeholder="Choose categories"
          options={CATEGORY_OPTIONS}
          value={selectedCategories}
          onChange={(next) => setValue("categories", next, { shouldValidate: true })}
          error={errors.categories?.message}
        />
        <MultiSelectDropdown
          label="Subjects interested"
          placeholder="Choose subjects"
          hint="Added by Super Admin under Subjects & Areas"
          options={subjectOptions}
          value={selectedSubjects}
          onChange={(next) => setValue("subjectsInterested", next)}
        />
        <MultiSelectDropdown
          label="Areas interested"
          placeholder="Choose areas"
          hint="Added by Super Admin under Subjects & Areas"
          options={areaOptions}
          value={selectedAreas}
          onChange={(next) => setValue("areasInterested", next)}
        />
        <TextField label="Notes" error={errors.notes?.message} {...register("notes")} />
        <Button type="submit" loading={createEnquiry.isPending} fullWidth>
          Save enquiry
        </Button>
      </form>
    </Modal>
  );
}

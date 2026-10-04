import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, Select, MultiSelectDropdown, toast } from "@/components/ui";
import { useCreateParentEnquiry } from "./api";
import { useSubjects, useAreas } from "@/features/master-data/api";
import { useRateCards } from "@/features/fees/api";
import { useAuthStore } from "@/features/auth/authStore";
import { STUDENT_CATEGORY_OPTIONS, getClassOptions } from "@/lib/studentCategoryOptions";
import { matchRateCard } from "@/lib/rateCardMatch";
import type { AddressProofType, Board, Gender } from "./types";

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
const ADDRESS_PROOF_OPTIONS = [
  { value: "AADHAR", label: "Aadhar" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "PASSPORT", label: "Passport" },
  { value: "OTHER", label: "Other" },
];

const schema = z.object({
  studentName: z.string().min(2, "Required"),
  contactNumber: z.string().min(6, "Required"),
  category: z.string().min(1, "Choose a category"),
  studentClass: z.string().min(1, "Choose a class"),
  board: z.string().min(1, "Choose a board"),
  subjectsRequired: z.array(z.string()).default([]),
  presentAddress: z.string().min(1, "Required"),
  area: z.string().optional(),
  preferredTutorGender: z.string().optional(),
  addressProofType: z.string().optional(),
  feesPrescribed: z.string().optional(),
  agreedFinalFees: z.string().optional(),
  parentQueries: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateParentEnquiryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createEnquiry = useCreateParentEnquiry();
  const user = useAuthStore((s) => s.user);
  const subjects = useSubjects();
  const areas = useAreas({ branchId: user?.branchId ?? undefined });
  const rateCards = useRateCards({ branchId: user?.branchId ?? undefined });
  const subjectOptions = (subjects.data ?? []).map((s) => ({ value: s.name, label: s.name }));
  const areaOptions = (areas.data ?? []).map((a) => ({ value: a.name, label: a.name }));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { subjectsRequired: [] } });

  const selectedCategory = watch("category");
  const selectedClass = watch("studentClass");
  const selectedBoard = watch("board");
  const selectedSubjects = watch("subjectsRequired") ?? [];
  const classOptions = getClassOptions(selectedCategory);

  // Prefills "Fees prescribed" from Super Admin's Fee Rate Cards the moment
  // both board and class are chosen — never overwrites a value the office
  // has already typed in by hand (see dirtyFields.feesPrescribed below).
  useEffect(() => {
    if (!selectedBoard || !selectedClass || dirtyFields.feesPrescribed) return;
    const match = matchRateCard(rateCards.data ?? [], selectedBoard, selectedClass);
    if (match) setValue("feesPrescribed", String(match.ratePerClass));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoard, selectedClass, rateCards.data]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createEnquiry.mutateAsync({
        studentName: values.studentName,
        contactNumber: values.contactNumber,
        studentClass: values.studentClass,
        board: values.board as Board,
        subjectsRequired: values.subjectsRequired,
        presentAddress: values.presentAddress,
        area: values.area || undefined,
        preferredTutorGender: (values.preferredTutorGender || undefined) as Gender | undefined,
        addressProofType: (values.addressProofType || undefined) as AddressProofType | undefined,
        feesPrescribed: values.feesPrescribed ? Number(values.feesPrescribed) : undefined,
        agreedFinalFees: values.agreedFinalFees ? Number(values.agreedFinalFees) : undefined,
        parentQueries: values.parentQueries || undefined,
      });
      toast.success(`Enquiry for ${values.studentName} added`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save enquiry");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New parent enquiry">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <TextField label="Name of the student" error={errors.studentName?.message} {...register("studentName")} />
        <TextField label="Contact number" error={errors.contactNumber?.message} {...register("contactNumber")} />
        <Select
          label="Category"
          placeholder="Choose a category"
          options={STUDENT_CATEGORY_OPTIONS}
          error={errors.category?.message}
          {...register("category", { onChange: () => setValue("studentClass", "") })}
        />
        <Select
          label="Class"
          placeholder={selectedCategory ? "Choose a class" : "Choose a category first"}
          options={classOptions}
          error={errors.studentClass?.message}
          disabled={!selectedCategory}
          {...register("studentClass")}
        />
        <Select label="Board" placeholder="Choose a board" options={BOARD_OPTIONS} error={errors.board?.message} {...register("board")} />
        <MultiSelectDropdown
          label="Subjects required"
          placeholder="Choose subjects"
          hint="Added by Super Admin under Subjects & Areas"
          options={subjectOptions}
          value={selectedSubjects}
          onChange={(next) => setValue("subjectsRequired", next)}
        />
        <TextField label="Present address" error={errors.presentAddress?.message} {...register("presentAddress")} />
        <Select
          label="Area"
          placeholder={areaOptions.length ? "Choose an area (optional)" : "No areas added for this branch yet"}
          options={areaOptions}
          disabled={areaOptions.length === 0}
          {...register("area")}
        />
        <Select
          label="Preferred tutor gender"
          placeholder="No preference"
          options={PREFERRED_GENDER_OPTIONS}
          {...register("preferredTutorGender")}
        />
        <Select
          label="Address proof type"
          placeholder="Select (optional)"
          options={ADDRESS_PROOF_OPTIONS}
          {...register("addressProofType")}
        />
        <TextField
          label="Fees prescribed"
          type="number"
          step="0.01"
          hint="Prefilled from Super Admin's fee rate cards once board & class are chosen — edit freely"
          error={errors.feesPrescribed?.message}
          {...register("feesPrescribed")}
        />
        <TextField
          label="Agreed final fees"
          type="number"
          step="0.01"
          hint="What you actually settled on with the parent, if different — visible to Super Admin in Reports"
          error={errors.agreedFinalFees?.message}
          {...register("agreedFinalFees")}
        />
        <TextField label="Queries from parent" error={errors.parentQueries?.message} {...register("parentQueries")} />
        <Button type="submit" loading={createEnquiry.isPending} fullWidth>
          Save enquiry
        </Button>
      </form>
    </Modal>
  );
}

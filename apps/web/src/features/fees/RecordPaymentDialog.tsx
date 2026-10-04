import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, TextField, toast } from "@/components/ui";
import { useRecordPayment } from "./api";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import type { StudentFeeInvoice } from "./types";

const schema = z.object({
  amount: z.string().min(1, "Required"),
  paymentMethod: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

/**
 * Two-step: record the payment, then (same modal) optionally attach proof
 * of the transaction — a screenshot or bank/UPI receipt — against the
 * invoice. The invoice already exists (it's what's being paid against), so
 * this attaches to invoice.id regardless of which step created it.
 */
export function RecordPaymentDialog({ invoice, onClose }: { invoice: StudentFeeInvoice | null; onClose: () => void }) {
  const recordPayment = useRecordPayment();
  const [recorded, setRecorded] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const handleClose = () => {
    setRecorded(false);
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    if (!invoice) return;
    try {
      await recordPayment.mutateAsync({ id: invoice.id, amount: Number(values.amount), paymentMethod: values.paymentMethod });
      toast.success("Payment recorded");
      setRecorded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment");
    }
  };

  if (!invoice) return null;

  if (recorded) {
    return (
      <Modal open={Boolean(invoice)} onClose={handleClose} title="Attach payment proof">
        <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          Optional — attach a screenshot or receipt of the transaction for {invoice.student.name}.
        </p>
        <DocumentsPanel ownerType="STUDENT_FEE_INVOICE" ownerId={invoice.id} docType="PAYMENT_PROOF" />
        <Button fullWidth onClick={handleClose} style={{ marginTop: "var(--space-4)" }}>
          Done
        </Button>
      </Modal>
    );
  }

  return (
    <Modal open={Boolean(invoice)} onClose={handleClose} title={`Record payment — ${invoice.student.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }} noValidate>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          Balance due: <strong>₹{invoice.balance}</strong> of ₹{invoice.payableFees}
        </p>
        <TextField label="Amount (₹)" type="number" step="0.01" error={errors.amount?.message} {...register("amount")} />
        <TextField label="Payment method" placeholder="Cash, UPI, Bank transfer..." error={errors.paymentMethod?.message} {...register("paymentMethod")} />
        <Button type="submit" loading={recordPayment.isPending} fullWidth>
          Record payment
        </Button>
      </form>
    </Modal>
  );
}

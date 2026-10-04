import { useEffect, useState } from "react";
import { Modal, Button, TextField, toast } from "@/components/ui";
import { useMarkTutorPaid } from "./api";
import type { TutorPaymentSummaryRow } from "./types";

interface MarkTutorPaidDialogProps {
  tutor: TutorPaymentSummaryRow | null;
  from: string;
  to: string;
  onClose: () => void;
}

/**
 * Records a real payout for one tutor, for the exact date range the report
 * is currently showing — see reports.service.ts markTutorPaid. Defaults
 * the amount to what's still outstanding, but stays editable (a partial
 * payment is a legitimate real-world case).
 */
export function MarkTutorPaidDialog({ tutor, from, to, onClose }: MarkTutorPaidDialogProps) {
  const markPaid = useMarkTutorPaid();
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (tutor) setAmount(String(tutor.outstandingAmount || tutor.payableAmount));
  }, [tutor]);

  const handleSubmit = async () => {
    if (!tutor) return;
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    try {
      await markPaid.mutateAsync({ tutorId: tutor.tutorId, from, to, amount: value });
      toast.success(`Recorded ₹${value} paid to ${tutor.tutorName}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment");
    }
  };

  return (
    <Modal open={Boolean(tutor)} onClose={onClose} title="Mark tutor as paid">
      <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-secondary)" }}>
        Recording a payment to <strong>{tutor?.tutorName}</strong> for this reporting period (
        {from} to {to}). Payable: ₹{tutor?.payableAmount ?? 0} · Already paid: ₹{tutor?.paidAmount ?? 0}.
      </p>
      <TextField label="Amount paid (₹)" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
        <Button variant="secondary" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button fullWidth loading={markPaid.isPending} onClick={handleSubmit}>
          Save payment
        </Button>
      </div>
    </Modal>
  );
}

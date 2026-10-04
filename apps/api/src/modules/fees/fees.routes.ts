import { Router } from "express";
import { feesController } from "./fees.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import {
  createRateCardSchema,
  listRateCardsQuerySchema,
  rateCardIdParamSchema,
  createInvoiceSchema,
  recordPaymentSchema,
  listInvoicesQuerySchema,
  invoiceIdParamSchema,
} from "./fees.types";

export const feesRouter = Router();

feesRouter.use(authenticate);

const officeAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN");
// A parent may only read their own children's invoices (self-scoped in the
// service layer) — invoice creation and payments stay office-only.
const invoiceReadAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN", "PARENT");
// Pricing is a Super Admin decision — a Branch Admin can still read the
// rates (needed when raising an invoice) but can no longer add/remove them.
const rateCardWriteAccess = authorize("SUPER_ADMIN");

feesRouter.get("/rate-cards", officeAccess, validate({ query: listRateCardsQuerySchema }), feesController.listRateCards);
feesRouter.post("/rate-cards", rateCardWriteAccess, validate({ body: createRateCardSchema }), feesController.createRateCard);
feesRouter.delete("/rate-cards/:rateCardId", rateCardWriteAccess, validate({ params: rateCardIdParamSchema }), feesController.deleteRateCard);

feesRouter.get("/invoices", invoiceReadAccess, validate({ query: listInvoicesQuerySchema }), feesController.listInvoices);
feesRouter.post("/invoices", officeAccess, validate({ body: createInvoiceSchema }), feesController.createInvoice);
feesRouter.post(
  "/invoices/:invoiceId/payment",
  officeAccess,
  validate({ params: invoiceIdParamSchema, body: recordPaymentSchema }),
  feesController.recordPayment,
);

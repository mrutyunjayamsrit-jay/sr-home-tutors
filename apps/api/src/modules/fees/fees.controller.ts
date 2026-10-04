import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok, paginationMeta } from "@/common/utils/apiResponse";
import { feesService } from "./fees.service";
import {
  createRateCardSchema,
  listRateCardsQuerySchema,
  createInvoiceSchema,
  recordPaymentSchema,
  listInvoicesQuerySchema,
} from "./fees.types";

export const feesController = {
  createRateCard: asyncHandler(async (req, res) => {
    const input = createRateCardSchema.parse(req.body);
    const card = await feesService.createRateCard(input, req.user!);
    created(res, card);
  }),
  listRateCards: asyncHandler(async (req, res) => {
    const query = listRateCardsQuerySchema.parse(req.query);
    const cards = await feesService.listRateCards(query, req.user!);
    ok(res, cards);
  }),
  deleteRateCard: asyncHandler(async (req, res) => {
    await feesService.deleteRateCard(req.params.rateCardId!, req.user!);
    noContent(res);
  }),

  createInvoice: asyncHandler(async (req, res) => {
    const input = createInvoiceSchema.parse(req.body);
    const invoice = await feesService.createInvoice(input, req.user!);
    created(res, invoice);
  }),
  listInvoices: asyncHandler(async (req, res) => {
    const query = listInvoicesQuerySchema.parse(req.query);
    const { items, total } = await feesService.listInvoices(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),
  recordPayment: asyncHandler(async (req, res) => {
    const input = recordPaymentSchema.parse(req.body);
    const invoice = await feesService.recordPayment(req.params.invoiceId!, input, req.user!);
    ok(res, invoice);
  }),
};

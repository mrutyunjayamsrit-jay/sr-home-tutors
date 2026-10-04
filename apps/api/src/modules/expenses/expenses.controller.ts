import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok } from "@/common/utils/apiResponse";
import { expensesService } from "./expenses.service";
import { createExpenseSchema, listExpensesQuerySchema } from "./expenses.types";

export const expensesController = {
  list: asyncHandler(async (req, res) => {
    const query = listExpensesQuerySchema.parse(req.query);
    const { items, total, totalAmount } = await expensesService.list(query, req.user!);
    ok(res, items, { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)), totalAmount });
  }),
  create: asyncHandler(async (req, res) => {
    const input = createExpenseSchema.parse(req.body);
    const expense = await expensesService.create(input, req.user!);
    created(res, expense);
  }),
  remove: asyncHandler(async (req, res) => {
    await expensesService.remove(req.params.expenseId!, req.user!);
    noContent(res);
  }),
};

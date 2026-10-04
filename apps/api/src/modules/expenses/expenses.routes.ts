import { Router } from "express";
import { expensesController } from "./expenses.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createExpenseSchema, listExpensesQuerySchema, expenseIdParamSchema } from "./expenses.types";

export const expensesRouter = Router();

expensesRouter.use(authenticate);
expensesRouter.use(authorize("SUPER_ADMIN", "BRANCH_ADMIN"));

expensesRouter.get("/", validate({ query: listExpensesQuerySchema }), expensesController.list);
expensesRouter.post("/", validate({ body: createExpenseSchema }), expensesController.create);
expensesRouter.delete("/:expenseId", validate({ params: expenseIdParamSchema }), expensesController.remove);

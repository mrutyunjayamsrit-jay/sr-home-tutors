import { Router } from "express";
import { tasksController } from "./tasks.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createTaskSchema, listTasksQuerySchema, taskIdParamSchema } from "./tasks.types";

export const tasksRouter = Router();

tasksRouter.use(authenticate);

// Both office roles can read, create, complete, and remove tasks — the
// service layer enforces who's allowed to do what to which task (a Branch
// Admin creates/removes only their own TO_SUPER_ADMIN requests and
// completes only TO_BRANCH ones; see tasks.service.ts).
const officeAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN");

tasksRouter.get("/", officeAccess, validate({ query: listTasksQuerySchema }), tasksController.list);
tasksRouter.post("/", officeAccess, validate({ body: createTaskSchema }), tasksController.create);
tasksRouter.post("/:taskId/complete", officeAccess, validate({ params: taskIdParamSchema }), tasksController.complete);
tasksRouter.delete("/:taskId", officeAccess, validate({ params: taskIdParamSchema }), tasksController.remove);

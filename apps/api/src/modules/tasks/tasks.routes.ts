import { Router } from "express";
import { tasksController } from "./tasks.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createTaskSchema, listTasksQuerySchema, taskIdParamSchema } from "./tasks.types";

export const tasksRouter = Router();

tasksRouter.use(authenticate);

// Assigning/removing a task is Super Admin only; a Branch Admin can read
// their own branch's tasks and mark one complete, but never create one.
const officeAccess = authorize("SUPER_ADMIN", "BRANCH_ADMIN");

tasksRouter.get("/", officeAccess, validate({ query: listTasksQuerySchema }), tasksController.list);
tasksRouter.post("/", authorize("SUPER_ADMIN"), validate({ body: createTaskSchema }), tasksController.create);
tasksRouter.post("/:taskId/complete", officeAccess, validate({ params: taskIdParamSchema }), tasksController.complete);
tasksRouter.delete("/:taskId", authorize("SUPER_ADMIN"), validate({ params: taskIdParamSchema }), tasksController.remove);

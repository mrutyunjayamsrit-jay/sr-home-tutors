import { Router } from "express";
import { usersController } from "./users.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createUserSchema, listUsersQuerySchema, userIdParamSchema } from "./users.types";

export const usersRouter = Router();

usersRouter.use(authenticate);
// Cross-branch user administration is Super Admin only — a Branch Admin
// managing their own branch's people happens through Registration/Assign
// Tutor instead, not this global tab.
usersRouter.use(authorize("SUPER_ADMIN"));

usersRouter.get("/", validate({ query: listUsersQuerySchema }), usersController.list);
usersRouter.get("/parents", usersController.listParentsForSelect);
usersRouter.post("/", validate({ body: createUserSchema }), usersController.create);
usersRouter.delete("/:userId", validate({ params: userIdParamSchema }), usersController.remove);
usersRouter.post("/:userId/enable", validate({ params: userIdParamSchema }), usersController.enable);
// Only reachable once a login is already disabled (enforced in the service
// layer) — a real, non-reversible delete of the login row, kept a distinct
// endpoint from the disable above so it always requires its own explicit step.
usersRouter.delete("/:userId/permanent", validate({ params: userIdParamSchema }), usersController.hardDelete);

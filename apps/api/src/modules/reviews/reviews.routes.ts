import { Router } from "express";
import { reviewsController } from "./reviews.controller";
import { authenticate } from "@/middleware/authenticate";
import { authorize } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import { createReviewSchema, listReviewsQuerySchema } from "./reviews.types";

export const reviewsRouter = Router();

reviewsRouter.use(authenticate);

// A parent can read their own child's reviews (self-scoped in the service
// layer); writing a review stays tutor/office-only.
reviewsRouter.get("/", authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR", "PARENT"), validate({ query: listReviewsQuerySchema }), reviewsController.list);
reviewsRouter.post("/", authorize("SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR"), validate({ body: createReviewSchema }), reviewsController.create);

import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "@/middleware/authenticate";
import { loginRateLimiter } from "@/middleware/rateLimit";

export const authRouter = Router();

authRouter.post("/login", loginRateLimiter, authController.login);
authRouter.post("/refresh", loginRateLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", authenticate, authController.me);
authRouter.post("/change-password", authenticate, authController.changePassword);
authRouter.post("/logout-all", authenticate, authController.logoutAllDevices);
authRouter.post("/acknowledge-rules", authenticate, authController.acknowledgeRules);
authRouter.get("/rules-status", authenticate, authController.rulesStatus);

// Google OIDC (Super Admin / Branch Admin only — enforced in google.service.ts)
authRouter.get("/google", loginRateLimiter, authController.googleStart);
authRouter.get("/google/callback", authController.googleCallback);

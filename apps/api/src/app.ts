import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { logger } from "@/common/logger";
import { errorHandler } from "@/middleware/errorHandler";
import { apiRateLimiter } from "@/middleware/rateLimit";
import { apiRouter } from "@/routes";

export function createApp() {
  const app = express();

  // Trust the first proxy hop (needed for correct req.ip / secure cookies
  // behind a load balancer/reverse proxy in production).
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  app.use(
    cors({
      origin: env.WEB_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(apiRateLimiter);

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));

  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `No route: ${req.method} ${req.path}` } });
  });

  app.use(errorHandler);

  return app;
}

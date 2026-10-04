import { createApp } from "./app";
import { env } from "@/config/env";
import { logger } from "@/common/logger";
import { prisma } from "@/common/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on ${env.APP_URL} (env: ${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

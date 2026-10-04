import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError } from "@/common/errors/AppError";
import { logger } from "@/common/logger";
import { env } from "@/config/env";

/**
 * Single place that turns any thrown error into a consistent JSON response.
 * Must be registered LAST, after all routes. Never leaks stack traces,
 * SQL, or internal details to the client in production.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  let mapped: AppError;

  if (err instanceof AppError) {
    mapped = err;
  } else if (err instanceof ZodError) {
    mapped = new ValidationError("Request validation failed", err.flatten());
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    mapped = mapPrismaError(err);
  } else {
    mapped = new (class extends AppError {
      readonly statusCode = 500;
      readonly code = "INTERNAL_ERROR";
    })(env.NODE_ENV === "production" ? "Something went wrong" : String((err as Error)?.message ?? err));
  }

  const isServerError = mapped.statusCode >= 500;
  const logPayload = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    statusCode: mapped.statusCode,
    code: mapped.code,
  };

  if (isServerError) {
    logger.error({ ...logPayload, err }, mapped.message);
  } else {
    logger.warn(logPayload, mapped.message);
  }

  res.status(mapped.statusCode).json({
    success: false,
    error: {
      code: mapped.code,
      message: mapped.message,
      ...(mapped.details ? { details: mapped.details } : {}),
    },
  });
}

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case "P2002": {
      const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      return new (class extends AppError {
        readonly statusCode = 409;
        readonly code = "CONFLICT";
      })(`A record with this ${target} already exists`);
    }
    case "P2025":
      return new (class extends AppError {
        readonly statusCode = 404;
        readonly code = "NOT_FOUND";
      })("Record not found");
    default:
      return new (class extends AppError {
        readonly statusCode = 500;
        readonly code = "DATABASE_ERROR";
      })("A database error occurred");
  }
}

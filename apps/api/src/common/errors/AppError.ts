/**
 * Typed application error hierarchy. Services/repositories throw these;
 * the central error-handling middleware (middleware/errorHandler.ts) maps
 * them to a consistent HTTP + JSON shape. Route handlers and services never
 * construct raw `res.status(...).json(...)` error responses directly — that
 * inconsistency is exactly what the brief calls out as something to avoid.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly code = "AUTHENTICATION_ERROR";
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";
}

export class RateLimitedError extends AppError {
  readonly statusCode = 429;
  readonly code = "RATE_LIMITED";
}

export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code = "INTERNAL_ERROR";
}

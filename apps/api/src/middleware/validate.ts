import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates req.body/query/params against zod schemas and replaces them
 * with the parsed (and thus coerced/defaulted) values. Throws ZodError on
 * failure, which errorHandler turns into a 400 VALIDATION_ERROR — so every
 * route gets the same request-validation behavior for free instead of
 * hand-rolled checks scattered through controllers.
 */
export function validate(targets: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (targets.body) req.body = targets.body.parse(req.body);
    if (targets.query) req.query = targets.query.parse(req.query) as typeof req.query;
    if (targets.params) req.params = targets.params.parse(req.params) as typeof req.params;
    next();
  };
}

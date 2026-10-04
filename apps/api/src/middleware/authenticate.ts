import type { NextFunction, Request, Response } from "express";
import { AuthenticationError } from "@/common/errors/AppError";
import { verifyAccessToken } from "@/modules/auth/token.service";

/** Requires a valid `Authorization: Bearer <access-token>` header. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return next(new AuthenticationError("Authentication required"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      branchId: payload.branchId,
      profileId: payload.profileId,
    };
    next();
  } catch {
    next(new AuthenticationError("Session expired, please log in again"));
  }
}

/** Attaches req.user if a valid token is present, but never rejects the request. */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = {
      id: payload.sub,
      role: payload.role,
      branchId: payload.branchId,
      profileId: payload.profileId,
    };
  } catch {
    // ignore — treated as unauthenticated
  }
  next();
}

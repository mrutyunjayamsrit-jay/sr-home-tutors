import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { AuthenticationError, ForbiddenError } from "@/common/errors/AppError";

/** Role gate. Must run after `authenticate`. */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthenticationError("Authentication required"));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError("You do not have permission to perform this action"));
    }
    next();
  };
}

/**
 * Enforces branch-tenant isolation: SUPER_ADMIN passes through unchecked;
 * every other role's req.user.branchId must match the branch the request
 * targets. `getTargetBranchId` extracts that branch id from params/query/
 * body/a pre-loaded resource — call sites decide where it comes from so
 * this stays generic across modules instead of being re-implemented per
 * route (a common source of IDOR bugs).
 */
export function requireBranchMatch(getTargetBranchId: (req: Request) => string | null | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthenticationError("Authentication required"));
    if (req.user.role === "SUPER_ADMIN") return next();

    const targetBranchId = getTargetBranchId(req);
    if (!targetBranchId || targetBranchId !== req.user.branchId) {
      return next(new ForbiddenError("You do not have access to this branch's data"));
    }
    next();
  };
}

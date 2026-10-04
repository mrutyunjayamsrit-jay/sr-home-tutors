import "express";
import type { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  branchId: string | null;
  /** Present only for TUTOR/PARENT/STUDENT — the linked domain profile id. */
  profileId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    // NOTE: `id` is intentionally NOT redeclared here — pino-http already
    // augments http.IncomingMessage (which Request extends) with a required
    // `id: ReqId` field via app.ts's pinoHttp() middleware. Redeclaring it
    // here with a different type/optionality previously created a conflicting
    // merge on the `Request` interface that silently broke unrelated
    // middleware typings (helmet/express.json) project-wide — a sharp-edge
    // worth leaving this comment about.
    user?: AuthenticatedUser;
  }
}

import { prisma } from "@/common/prisma";

/**
 * Collision-checked username generator shared by every module that
 * provisions a login (branches, users). Centralized so the "how do we pick
 * a username" rule can't drift between call sites.
 */
export async function generateUniqueUsername(base: string): Promise<string> {
  const cleaned = base.toLowerCase().replace(/[^a-z0-9]/g, "");
  const root = cleaned || "user";
  let candidate = root;
  let suffix = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${root}${suffix}`;
  }
  return candidate;
}

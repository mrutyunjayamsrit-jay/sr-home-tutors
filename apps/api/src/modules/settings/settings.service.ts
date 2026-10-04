import { prisma } from "@/common/prisma";
import type { UpdateSettingsInput } from "./settings.types";

const SINGLETON_ID = "singleton";

export const settingsService = {
  /** Reads the one settings row, creating it with defaults on first access (no separate seed/migration data step needed). */
  async get() {
    return prisma.orgSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
  },

  async update(input: UpdateSettingsInput, actorUserId: string) {
    const before = await settingsService.get();

    const updated = await prisma.orgSettings.update({
      where: { id: SINGLETON_ID },
      data: {
        ...(input.organizationName !== undefined ? { organizationName: input.organizationName } : {}),
        ...(input.supportEmail !== undefined ? { supportEmail: input.supportEmail || null } : {}),
        ...(input.supportPhone !== undefined ? { supportPhone: input.supportPhone || null } : {}),
        ...(input.tutorRulesText !== undefined ? { tutorRulesText: input.tutorRulesText } : {}),
        updatedById: actorUserId,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId,
        action: "SETTINGS_UPDATED",
        entityType: "OrgSettings",
        entityId: SINGLETON_ID,
        beforeJson: { ...before },
        afterJson: { ...updated },
      },
    });

    return updated;
  },
};

-- CreateTable
CREATE TABLE "OrgSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "organizationName" TEXT NOT NULL DEFAULT 'SR Home Tutors',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "tutorRulesText" TEXT NOT NULL DEFAULT 'I obey the rules and regulations of SR Home Tutors and all criteria of the institute.',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSettings_pkey" PRIMARY KEY ("id")
);

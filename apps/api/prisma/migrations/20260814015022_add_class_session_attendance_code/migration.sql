-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "attendanceCode" TEXT,
ADD COLUMN     "attendanceCodeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "attendanceCodeExpiresAt" TIMESTAMP(3);

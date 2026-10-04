-- AlterEnum
ALTER TYPE "AttendanceMarkMethod" ADD VALUE 'MANUAL_AREA';

-- AlterTable
ALTER TABLE "ClassSession" DROP COLUMN "attendanceCode",
DROP COLUMN "attendanceCodeAttempts",
DROP COLUMN "attendanceCodeExpiresAt",
ADD COLUMN     "manualAreaText" TEXT;


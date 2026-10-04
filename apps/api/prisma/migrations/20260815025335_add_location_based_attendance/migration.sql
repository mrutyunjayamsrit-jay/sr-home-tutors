-- CreateEnum
CREATE TYPE "AttendanceMarkMethod" AS ENUM ('MANUAL', 'CLASS_CODE', 'LOCATION');

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "markMethod" "AttendanceMarkMethod",
ADD COLUMN     "tutorMarkDistanceMeters" INTEGER,
ADD COLUMN     "tutorMarkLatitude" DECIMAL(9,6),
ADD COLUMN     "tutorMarkLongitude" DECIMAL(9,6);

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "longitude" DECIMAL(9,6);

-- AlterTable
ALTER TABLE "ParentEnquiry" ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6);

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "ParentEnquiry" ADD COLUMN     "preferredTutorGender" "Gender";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "preferredTutorGender" "Gender";

-- AlterTable
ALTER TABLE "Tutor" ADD COLUMN     "gender" "Gender";

-- AlterTable
ALTER TABLE "TutorEnquiry" ADD COLUMN     "gender" "Gender";


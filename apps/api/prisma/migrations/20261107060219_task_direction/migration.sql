-- CreateEnum
CREATE TYPE "TaskDirection" AS ENUM ('TO_BRANCH', 'TO_SUPER_ADMIN');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "direction" "TaskDirection" NOT NULL DEFAULT 'TO_BRANCH';

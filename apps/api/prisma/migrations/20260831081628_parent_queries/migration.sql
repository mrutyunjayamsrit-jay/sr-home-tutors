-- CreateEnum
CREATE TYPE "QueryTarget" AS ENUM ('BRANCH', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('OPEN', 'ANSWERED');

-- CreateTable
CREATE TABLE "ParentQuery" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "askedById" TEXT NOT NULL,
    "target" "QueryTarget" NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "QueryStatus" NOT NULL DEFAULT 'OPEN',
    "answer" TEXT,
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentQuery_branchId_target_status_idx" ON "ParentQuery"("branchId", "target", "status");

-- CreateIndex
CREATE INDEX "ParentQuery_askedById_idx" ON "ParentQuery"("askedById");

-- AddForeignKey
ALTER TABLE "ParentQuery" ADD CONSTRAINT "ParentQuery_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "area" TEXT;

-- AlterTable
ALTER TABLE "ParentEnquiry" ADD COLUMN     "area" TEXT;

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "Area_branchId_idx" ON "Area"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Area_branchId_name_key" ON "Area"("branchId", "name");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


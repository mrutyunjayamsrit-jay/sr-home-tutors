-- AlterTable
ALTER TABLE "Tutor" ADD COLUMN     "interviewRating" INTEGER;

-- AlterTable
ALTER TABLE "TutorEnquiry" ADD COLUMN     "interviewRating" INTEGER;

-- CreateTable
CREATE TABLE "TutorRating" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ratedById" TEXT NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorRating_assignmentId_key" ON "TutorRating"("assignmentId");

-- CreateIndex
CREATE INDEX "TutorRating_tutorId_idx" ON "TutorRating"("tutorId");

-- AddForeignKey
ALTER TABLE "TutorRating" ADD CONSTRAINT "TutorRating_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorRating" ADD CONSTRAINT "TutorRating_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

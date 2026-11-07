-- AlterTable
ALTER TABLE "FeeRateCard" ADD COLUMN     "numberOfSubjects" INTEGER,
ADD COLUMN     "totalAmount" DECIMAL(10,2),
ADD COLUMN     "totalClasses" INTEGER,
ALTER COLUMN "ratePerClass" DROP NOT NULL;

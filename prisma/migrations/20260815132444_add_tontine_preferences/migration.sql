-- AlterTable
ALTER TABLE "Tontine" ADD COLUMN     "commissionsTransactionsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "objectifMontant" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commissionScopeDefault" TEXT NOT NULL DEFAULT 'personnel',
ADD COLUMN     "recoitCommissions" BOOLEAN NOT NULL DEFAULT true;

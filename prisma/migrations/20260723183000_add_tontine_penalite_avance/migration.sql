-- AlterTable: Tontine penalite fields
ALTER TABLE "Tontine" ADD COLUMN "penaliteRetardActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tontine" ADD COLUMN "penaliteRetardMontant" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Tontine" ADD COLUMN "penaliteRetardDelaiJours" INTEGER NOT NULL DEFAULT 3;

-- AlterTable: TontineCotisation penalite field
ALTER TABLE "TontineCotisation" ADD COLUMN "montantPenalite" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: TontineMembre soldeAvance field
ALTER TABLE "TontineMembre" ADD COLUMN "soldeAvance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: TontineDistribution dateLimiteCotisation field
ALTER TABLE "TontineDistribution" ADD COLUMN "dateLimiteCotisation" TIMESTAMP(3);

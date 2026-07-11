-- CreateTable
CREATE TABLE "Tontine" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "organisateurId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "montantCotisation" DOUBLE PRECISION NOT NULL,
    "frequence" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "fraisOrganisateurParDefaut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scopeCommission" TEXT NOT NULL DEFAULT 'activite',
    "nombreTours" INTEGER,
    "dateDistribution" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Tontine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineMembre" (
    "id" SERIAL NOT NULL,
    "tontineId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "ordrePassage" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'actif',

    CONSTRAINT "TontineMembre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineCotisation" (
    "id" SERIAL NOT NULL,
    "tontineId" INTEGER NOT NULL,
    "membreId" INTEGER NOT NULL,
    "periode" TIMESTAMP(3) NOT NULL,
    "montantBase" DOUBLE PRECISION NOT NULL,
    "fraisOrganisateur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "datePaiement" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'en_attente',

    CONSTRAINT "TontineCotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineTour" (
    "id" SERIAL NOT NULL,
    "tontineId" INTEGER NOT NULL,
    "numeroTour" INTEGER NOT NULL,
    "datePrevue" TIMESTAMP(3) NOT NULL,
    "beneficiaireId" INTEGER NOT NULL,
    "montantAttendu" DOUBLE PRECISION NOT NULL,
    "montantCollecte" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',

    CONSTRAINT "TontineTour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineDistribution" (
    "id" SERIAL NOT NULL,
    "tontineId" INTEGER NOT NULL,
    "dateDistribution" TIMESTAMP(3) NOT NULL,
    "montantTotalCollecte" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantAlloueVivres" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantAlloueArgent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'planifiee',

    CONSTRAINT "TontineDistribution_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "tontineCotisationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "TontineDistribution_tontineId_key" ON "TontineDistribution"("tontineId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_tontineCotisationId_key" ON "Transaction"("tontineCotisationId");

-- AddForeignKey
ALTER TABLE "Tontine" ADD CONSTRAINT "Tontine_organisateurId_fkey" FOREIGN KEY ("organisateurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineMembre" ADD CONSTRAINT "TontineMembre_tontineId_fkey" FOREIGN KEY ("tontineId") REFERENCES "Tontine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineCotisation" ADD CONSTRAINT "TontineCotisation_tontineId_fkey" FOREIGN KEY ("tontineId") REFERENCES "Tontine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineCotisation" ADD CONSTRAINT "TontineCotisation_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "TontineMembre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineTour" ADD CONSTRAINT "TontineTour_tontineId_fkey" FOREIGN KEY ("tontineId") REFERENCES "Tontine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineDistribution" ADD CONSTRAINT "TontineDistribution_tontineId_fkey" FOREIGN KEY ("tontineId") REFERENCES "Tontine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tontineCotisationId_fkey" FOREIGN KEY ("tontineCotisationId") REFERENCES "TontineCotisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

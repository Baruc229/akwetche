ALTER TABLE "TontineCotisation" ADD COLUMN "tourId" INTEGER;

ALTER TABLE "TontineCotisation" ADD CONSTRAINT "TontineCotisation_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TontineTour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

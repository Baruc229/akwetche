-- Marque les cotisations remplies par imputation de surplus (jours de mise payés d'avance).
-- Permet de dés-imputer proprement ces jours quand on réduit ou supprime une mise.
ALTER TABLE "TontineCotisation" ADD COLUMN "imputee" BOOLEAN NOT NULL DEFAULT false;

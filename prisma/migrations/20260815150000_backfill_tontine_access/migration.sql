-- Backfill : active l'accès tontine pour tous les utilisateurs ayant déjà des tontines,
-- afin qu'ils conservent l'accès après le retrait du contrôle administrateur.
UPDATE "User"
SET "tontineAccess" = true
WHERE "id" IN (
  SELECT DISTINCT "organisateurId"
  FROM "Tontine"
)
AND "tontineAccess" = false;

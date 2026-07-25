-- 1. Link old cotisations (without tourId) to their closest tour
WITH closest_tour AS (
  SELECT c.id AS cotisation_id, t.id AS tour_id,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY ABS(EXTRACT(EPOCH FROM (c."periode" - t."datePrevue"))) ASC) AS rn
  FROM "TontineCotisation" c
  JOIN "TontineTour" t ON c."tontineId" = t."tontineId"
  WHERE c."tourId" IS NULL
)
UPDATE "TontineCotisation" c
SET "tourId" = ct.tour_id
FROM closest_tour ct
WHERE c.id = ct.cotisation_id AND ct.rn = 1;

-- 2. Recalculate montantCollecte for all tours
UPDATE "TontineTour" t
SET "montantCollecte" = COALESCE(sums.total, 0)
FROM (
  SELECT "tourId", SUM("montantPaye") AS total
  FROM "TontineCotisation"
  WHERE "tourId" IS NOT NULL
  GROUP BY "tourId"
) sums
WHERE t.id = sums."tourId";

-- 3. Reset all soldeAvance to 0 first
UPDATE "TontineMembre" SET "soldeAvance" = 0;

-- 4. Recalculate soldeAvance per member from net surplus
-- For each member, compute net = SUM(montantPaye) - SUM(montantTotal)
-- but only for cotisations that are fully paid with surplus
UPDATE "TontineMembre" m
SET "soldeAvance" = GREATEST(0, COALESCE(sums.total_paye, 0) - COALESCE(sums.total_du, 0))
FROM (
  SELECT "membreId", SUM("montantPaye") AS total_paye, SUM("montantTotal") AS total_du
  FROM "TontineCotisation"
  GROUP BY "membreId"
) sums
WHERE m.id = sums."membreId";

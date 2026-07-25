UPDATE "TontineMembre" m
SET "soldeAvance" = GREATEST(0, COALESCE(sums.total_paye, 0) - COALESCE(sums.total_du, 0))
FROM (
  SELECT "membreId", SUM("montantPaye") AS total_paye, SUM("montantTotal") AS total_du
  FROM "TontineCotisation"
  GROUP BY "membreId"
) sums
WHERE m.id = sums."membreId";

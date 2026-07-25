SELECT m.id, m.nom, m."soldeAvance", COALESCE(sums.total_paye, 0) AS total_paye, COALESCE(sums.total_du, 0) AS total_du
FROM "TontineMembre" m
LEFT JOIN (
  SELECT "membreId", SUM("montantPaye") AS total_paye, SUM("montantTotal") AS total_du
  FROM "TontineCotisation"
  GROUP BY "membreId"
) sums ON m.id = sums."membreId"
WHERE m."soldeAvance" > 0;

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok, created } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const { nom, contact } = await req.json();
  if (!nom) return badRequest("Le nom est obligatoire");

  let ordrePassage: number | null = null;
  if (tontine.type === "rotative_simple") {
    const maxOrdre = await prisma.tontineMembre.aggregate({
      where: { tontineId },
      _max: { ordrePassage: true },
    });
    ordrePassage = (maxOrdre._max.ordrePassage || 0) + 1;
  }

  const membre = await prisma.tontineMembre.create({
    data: {
      tontineId,
      nom,
      contact: contact || null,
      ordrePassage,
    },
  });

  return created({ membre });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const tontineId = parseInt(id);
  if (!tontineId) return badRequest("ID invalide");

  const tontine = await prisma.tontine.findFirst({
    where: { id: tontineId, organisateurId: userId },
  });
  if (!tontine) return badRequest("Tontine introuvable");

  const membres = await prisma.tontineMembre.findMany({
    where: { tontineId },
    include: {
      _count: { select: { cotisations: true } },
    },
    orderBy: [{ statut: "asc" }, { ordrePassage: "asc" as const }, { nom: "asc" }],
  });

  return ok({ membres });
}

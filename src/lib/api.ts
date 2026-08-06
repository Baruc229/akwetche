import { NextResponse } from "next/server";
import { getAuthUserId } from "./auth";

export function unauthorized() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Parse un montant et retourne null si ce n'est pas un nombre fini. */
export function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

/** Parse un entier strictement positif, sinon null. */
export function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(num)) return null;
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export function ok(data: unknown) {
  return NextResponse.json(data, { status: 200 });
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export async function requireAuth() {
  const userId = await getAuthUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function requireAdminAuth() {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Unauthorized");
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role === "user") throw new Error("Forbidden");
  return userId;
}

export async function requireTontineAccess() {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Unauthorized");
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, tontineAccess: true } });
  if (!user) throw new Error("Forbidden");
  if (user.role === "user" && !user.tontineAccess) throw new Error("Forbidden");
  return userId;
}

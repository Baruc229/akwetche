import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, hashPassword } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role === "user") return unauthorized();

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, plan: true, status: true,
      initialBalance: true, currency: true, createdAt: true,
      emailVerified: true, loginAttempts: true, lockedUntil: true,
      _count: { select: { transactions: true, products: true, sales: true, loginLogs: true } },
      subscription: { select: { status: true, amount: true, currency: true, endDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({ users });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== "super_admin") return unauthorized();

  const { name, email, password, plan, role } = await req.json();
  if (!name || !email || !password) return badRequest("Nom, email et mot de passe requis");
  if (password.length < 8) return badRequest("Minimum 8 caractères");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return badRequest("Cet email est déjà utilisé");

  const user = await prisma.user.create({
    data: {
      name, email,
      password: await hashPassword(password),
      role: role || "admin",
      plan: plan || "free",
      status: "active",
      emailVerified: new Date(),
      initialBalance: 0,
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return ok({ user, message: "Admin créé avec succès" });
}

export async function DELETE(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== "super_admin") return unauthorized();

  const { id } = await req.json();
  if (id === userId) return badRequest("Vous ne pouvez pas vous supprimer vous-même");

  await prisma.user.delete({ where: { id: parseInt(id) } });
  return ok({ success: true });
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== "super_admin") return unauthorized();

  const { id, role } = await req.json();
  if (!id || !role) return badRequest("ID et rôle requis");
  if (!["super_admin", "admin", "user"].includes(role)) return badRequest("Rôle invalide");

  await prisma.user.update({
    where: { id: parseInt(id) },
    data: { role },
  });

  return ok({ success: true });
}

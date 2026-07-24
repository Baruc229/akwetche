import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, hashPassword } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role === "user") return unauthorized();

  const url = new URL(req.url);
  const singleId = url.searchParams.get("id");

  if (singleId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(singleId) },
      select: {
        id: true, name: true, email: true, role: true, plan: true, status: true,
        initialBalance: true, currency: true, baseCurrency: true,
        countryCode: true, phone: true, createdAt: true,
        emailVerified: true, loginAttempts: true, lockedUntil: true, tontineAccess: true,
        _count: { select: { transactions: true, products: true, sales: true, loginLogs: true } },
        subscription: { select: { status: true, amount: true, currency: true, endDate: true } },
        subscriptionHistory: { orderBy: { createdAt: "desc" } },
      },
    });
    return ok({ user });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, plan: true, status: true,
      initialBalance: true, currency: true, baseCurrency: true,
      countryCode: true, phone: true, createdAt: true,
      emailVerified: true, loginAttempts: true, lockedUntil: true, tontineAccess: true,
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
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await createNotification(user.id, "admin", `Vous avez été nommé ${user.role === "super_admin" ? "super administrateur" : "administrateur"}`, "/dashboard");
  await createNotification(userId, "admin", `Admin ajouté : ${user.name} (${user.role})`, "/admin");

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

  const body = await req.json();
  const id = body.id;
  if (!id) return badRequest("ID requis");

  const target = await prisma.user.findUnique({ where: { id: parseInt(id) }, select: { id: true, name: true, email: true } });
  if (!target) return badRequest("Utilisateur introuvable");

  if (body.unlock) {
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { lockedUntil: null, loginAttempts: 0 },
    });
    await createNotification(target.id, "system", `Votre compte a été déverrouillé par un administrateur.`, "/dashboard");
    await createNotification(userId, "system", `Compte de ${target.name} déverrouillé.`, "/admin");
  } else if (body.tontineAccess !== undefined) {
    const enabled = Boolean(body.tontineAccess);
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { tontineAccess: enabled },
    });
    await createNotification(target.id, "system", enabled ? `L'accès aux tontines a été activé sur votre compte.` : `L'accès aux tontines a été désactivé sur votre compte.`, "/dashboard");
  } else {
    const role = body.role;
    if (!role) return badRequest("Rôle requis");
    if (!["super_admin", "admin", "user"].includes(role)) return badRequest("Rôle invalide");

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role },
    });

    const roleLabel = role === "super_admin" ? "super administrateur" : role === "admin" ? "administrateur" : "utilisateur";
    await createNotification(target.id, "role", `Votre rôle a été changé en "${roleLabel}"`, "/dashboard");
    await createNotification(userId, "role", `Rôle de ${target.name} changé en "${roleLabel}"`, "/admin");
  }

  return ok({ success: true });
}

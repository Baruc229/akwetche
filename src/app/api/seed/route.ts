import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const adminUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!adminUser || adminUser.role === "user") return unauthorized();

  const adminEmail = "admin@akwetche.app";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) return ok({ message: "Admin déjà existant", id: existing.id });

  const randomPassword = require("crypto").randomBytes(4).toString("hex");

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: adminEmail,
      password: await hashPassword(randomPassword),
      role: "super_admin",
      initialBalance: 1000000,
      emailVerified: new Date(),
      status: "active",
      plan: "free",
    },
  });

  return ok({
    message: "Admin créé",
    id: admin.id,
    email: adminEmail,
  });
}

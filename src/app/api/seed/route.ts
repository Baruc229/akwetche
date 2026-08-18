import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";

export async function POST() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: "super_admin" } });

  if (existingAdmin) {
    const userId = await getAuthUserId();
    if (!userId) return unauthorized();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role === "user") return unauthorized();
  }

  const adminEmail = "admin@akwetche.app";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) return ok({ message: "Admin déjà existant", id: existing.id });

  const adminPassword = "admin123";

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: adminEmail,
      password: await hashPassword(adminPassword),
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

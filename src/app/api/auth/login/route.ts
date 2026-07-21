import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, generateToken } from "@/lib/auth";
import { badRequest, ok } from "@/lib/api";
import { cookies } from "next/headers";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return badRequest("Email et mot de passe requis");
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await prisma.loginLog.create({
        data: { ip, userAgent, success: false, reason: `user_not_found:${email}` },
      });
      return badRequest("Email ou mot de passe incorrect");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await prisma.loginLog.create({
        data: { ip, userAgent, success: false, reason: "account_locked", userId: user.id },
      });
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return badRequest(`Compte temporairement verrouillé. Réessayez dans ${remaining} minute(s).`);
    }

    const valid = await comparePassword(password, user.password);

    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const update: { loginAttempts: number; lockedUntil?: Date } = { loginAttempts: attempts };

      if (attempts >= MAX_ATTEMPTS) {
        update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }

      await prisma.user.update({ where: { id: user.id }, data: update });
      await prisma.loginLog.create({
        data: { ip, userAgent, success: false, reason: "invalid_password", userId: user.id },
      });

      return badRequest("Email ou mot de passe incorrect");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, status: "active" },
    });

    await prisma.loginLog.create({
      data: { ip, userAgent, success: true, reason: "success", userId: user.id },
    });

    const token = generateToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    await prisma.session.create({
      data: { token, userId: user.id, ipAddress: ip, userAgent },
    });

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified !== null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return badRequest("Erreur lors de la connexion");
  }
}

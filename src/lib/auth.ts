import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  console.warn("⚠ JWT_SECRET non défini — utiliser une clé de développement");
}
const SECRET = JWT_SECRET || "dev-jwt-secret-do-not-use-in-production";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function getAuthUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  // Révocation : le jeton n'est valide que s'il correspond à une session
  // existante ET à un compte actif. Une déconnexion, une suppression de
  // session ou une désactivation de compte invalide immédiatement le jeton.
  const { prisma } = await import("@/lib/prisma");
  const session = await prisma.session.findUnique({
    where: { token },
    select: { userId: true, user: { select: { status: true } } },
  });
  if (!session) return null;
  if (session.user.status === "inactive") return null;
  return session.userId;
}

export async function requireAdmin(): Promise<number | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role === "user") return null;
  return userId;
}

export function generateEmailToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

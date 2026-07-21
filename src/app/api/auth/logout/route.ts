import { ok } from "@/lib/api";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  cookieStore.set("token", "", { httpOnly: true, maxAge: 0, path: "/" });
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  return ok({ success: true });
}

import { ok } from "@/lib/api";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("token", "", { httpOnly: true, maxAge: 0, path: "/" });
  return ok({ success: true });
}

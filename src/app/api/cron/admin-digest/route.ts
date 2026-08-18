import { NextRequest } from "next/server";
import { sendAdminDigest } from "@/lib/admin-emails";

const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("CRON_SECRET must be set in production");
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await sendAdminDigest();

  return Response.json({ ok: true });
}

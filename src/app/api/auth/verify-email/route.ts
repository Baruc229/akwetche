import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, ok } from "@/lib/api";
import { notifyAdmin } from "@/lib/admin-emails";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return badRequest("Token manquant");
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, name: true, email: true, emailVerified: true, countryCode: true, phone: true, baseCurrency: true, plan: true } },
    },
  });

  if (!record || record.type !== "email_verification") {
    return badRequest("Token invalide");
  }

  if (record.expiresAt < new Date()) {
    return badRequest("Token expiré. Demandez un nouveau lien de vérification.");
  }

  if (record.user.emailVerified) {
    return ok({ message: "Email déjà vérifié" });
  }

  const user = await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date(), status: "active" },
  });

  const userCountry = record.user.countryCode;
  notifyAdmin("new_registration", {
    userName: record.user.name || record.user.email,
    userEmail: record.user.email,
    countryCode: userCountry || undefined,
    phone: record.user.phone || undefined,
    baseCurrency: record.user.baseCurrency || "XOF",
  });

  await prisma.verificationToken.delete({ where: { id: record.id } });

  const redirectUrl = user.plan === "premium" ? "/payment" : "/dashboard";

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta http-equiv="refresh" content="3;url=${redirectUrl}"><title>Email vérifié</title></head>
    <body style="font-family:sans-serif;background:#f5f5f0;padding:40px 20px">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center">
        <div style="width:64px;height:64px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
          <svg width="32" height="32" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 style="color:#059669;font-size:24px;margin:0 0 8px">Email vérifié !</h1>
        <p style="color:#666;line-height:1.6">Votre adresse email a été confirmée avec succès. Redirection automatique...</p>
        <a href="${redirectUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">Continuer</a>
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

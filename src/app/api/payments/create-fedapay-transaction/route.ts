import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

const FEDAPAY_API_KEY = process.env.FEDAPAY_API_KEY;
const FEDAPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY;

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, email: true, plan: true, subscription: { select: { status: true } } },
  });
  if (!user) return unauthorized();
  if (user.plan !== "premium") return badRequest("Plan non Premium");
  if (user.subscription?.status === "active") return badRequest("Déjà abonné");

  if (!FEDAPAY_API_KEY || !FEDAPAY_PUBLIC_KEY) return badRequest("FedaPay non configuré");

  const isXOF = user.currency === "XOF" || user.currency === "FCFA";
  const amount = isXOF ? 5000 : 799;
  const currency = isXOF ? "XOF" : "EUR";

  const base = process.env.FEDAPAY_SANDBOX === "false"
    ? "https://api.fedapay.com"
    : "https://api-sandbox.fedapay.com";

  try {
    const res = await fetch(`${base}/v1/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FEDAPAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-User-Agent": "Akwetche/1.0",
      },
      body: JSON.stringify({
        amount,
        currency: { iso: currency },
        description: "Akwetche Premium — abonnement mensuel",
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/webhook?provider=fedapay`,
        customer: {
          email: user.email,
          reference: String(userId),
        },
      }),
    });

    if (!res.ok) return badRequest("Erreur de paiement FedaPay");

    const transaction = await res.json();
    return ok({
      token: transaction.data?.token || transaction.token,
      transactionId: transaction.data?.id || transaction.id,
    });
  } catch {
    return badRequest("Erreur de connexion FedaPay");
  }
}

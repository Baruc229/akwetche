import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

async function getPayPalAccessToken() {
  const PAYPAL_SECRET = process.env.PAYPAL_SECRET_KEY;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) return null;

  const base = process.env.PAYPAL_SANDBOX === "false"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")}` },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, plan: true, subscription: { select: { status: true } } },
  });
  if (!user) return unauthorized();
  if (user.plan !== "premium") return badRequest("Plan non Premium");
  if (user.subscription?.status === "active") return badRequest("Déjà abonné");

  const token = await getPayPalAccessToken();
  if (!token) return badRequest("PayPal non configuré");

  const base = process.env.PAYPAL_SANDBOX === "false"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const isXOF = user.currency === "XOF" || user.currency === "FCFA";
  const amount = isXOF ? "5000.00" : "7.99";
  const currencyCode = isXOF ? "EUR" : "EUR";

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: currencyCode, value: amount },
        description: "Akwetche Premium — abonnement mensuel",
        custom_id: String(userId),
      }],
    }),
  });

  if (!res.ok) return badRequest("Erreur PayPal");

  const order = await res.json();
  return ok({ orderID: order.id });
}

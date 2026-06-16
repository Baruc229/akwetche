import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";
import { activatePremium } from "@/lib/subscription";

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

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { orderID } = await req.json();
  if (!orderID) return badRequest("orderID requis");

  const token = await getPayPalAccessToken();
  if (!token) return badRequest("PayPal non configuré");

  const base = process.env.PAYPAL_SANDBOX === "false"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return badRequest("Échec de la capture PayPal");

  const capture = await res.json();

  const isApproved = capture.status === "COMPLETED" || capture.status === "APPROVED";
  if (!isApproved) return badRequest("Paiement non approuvé");

  const purchaseUnit = capture.purchase_units?.[0];
  const customId = purchaseUnit?.payments?.captures?.[0]?.custom_id || purchaseUnit?.custom_id;
  const capturedUserId = customId ? parseInt(customId) : null;

  if (capturedUserId && capturedUserId === userId) {
    await activatePremium(userId, "paypal", "paypal");
  }

  return ok({ status: "success" });
}

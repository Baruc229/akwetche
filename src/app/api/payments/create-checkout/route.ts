import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  if (!STRIPE_SECRET_KEY) {
    return badRequest("Stripe non configuré (mode démo)");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, currency: true },
  });
  if (!user) return unauthorized();

  const isXOF = user.currency === "XOF" || user.currency === "FCFA";
  const amount = isXOF ? 5000 : 799;
  const currency = isXOF ? "xof" : "eur";

  const Stripe = require("stripe");
  const stripe = Stripe(STRIPE_SECRET_KEY);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: "Akwetche Premium" },
          unit_amount: amount,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    client_reference_id: String(userId),
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings?payment=cancelled`,
  });

  return ok({ url: session.url });
}

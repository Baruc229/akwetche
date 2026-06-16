import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, hasStripe, getWebhookSecret } from "@/lib/stripe";
import { ok } from "@/lib/api";
import { activatePremium } from "@/lib/subscription";

async function activateSubscription(userId: number, provider: string, method: string) {
  await activatePremium(userId, provider, method);
}

async function handleStripeWebhook(req: NextRequest) {
  if (!hasStripe()) return ok({ received: true });

  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, getWebhookSecret());
  } catch {
    return new Response("Signature verification failed", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const userId = parseInt(pi.metadata?.userId || "");
    if (userId) await activateSubscription(userId, "stripe", "card");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = parseInt(session.client_reference_id || "");
    if (userId) await activateSubscription(userId, "stripe", "card");
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "expired" : "cancelled";
    const userId = parseInt(sub.metadata?.userId || "");
    if (userId) {
      await prisma.subscription.update({
        where: { userId },
        data: { status },
      });
    }
  }

  return ok({ received: true });
}

async function handlePayPalWebhook(req: NextRequest) {
  const body = await req.json();

  const eventType = body.event_type;
  if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = body.resource;
    const customId = resource?.purchase_units?.[0]?.custom_id
      || resource?.custom_id
      || body.resource?.custom_id;
    if (customId) {
      const userId = parseInt(customId);
      if (userId) await activateSubscription(userId, "paypal", "paypal");
    }
  }

  return ok({ received: true });
}

async function handleFedaPayWebhook(req: NextRequest) {
  try {
    const body = await req.json();

    const status = body.data?.status || body.status;
    const reference = body.data?.customer?.reference
      || body.customer?.reference
      || body.data?.reference
      || body.reference;

    if (status === "approved" || status === "completed" || status === "success") {
      if (reference) {
        const userId = parseInt(reference);
        if (userId) await activateSubscription(userId, "fedapay", "mobile_money");
      }
    }

    return ok({ received: true });
  } catch {
    return ok({ received: true });
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "stripe";

  switch (provider) {
    case "paypal":
      return handlePayPalWebhook(req);
    case "fedapay":
      return handleFedaPayWebhook(req);
    default:
      return handleStripeWebhook(req);
  }
}

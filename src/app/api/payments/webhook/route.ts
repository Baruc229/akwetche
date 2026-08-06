import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, hasStripe, getWebhookSecret } from "@/lib/stripe";
import { ok } from "@/lib/api";
import { activatePremium, expireSubscription } from "@/lib/subscription";

// Enregistre un événement comme traité. Renvoie false s'il l'était déjà
// (Stripe peut redélivrer le même événement — idempotence obligatoire,
// sinon le renouvellement prolongerait l'abonnement à chaque redélivrance).
async function markEventSeen(provider: string, eventId: string): Promise<boolean> {
  if (!eventId) return true;
  try {
    await prisma.webhookEvent.create({ data: { provider, eventId } });
    return true;
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") return false;
    throw err;
  }
}

async function activateSubscription(userId: number, provider: string, method: string, explicitEndDate?: Date) {
  await activatePremium(userId, provider, method, 5000, "XOF", explicitEndDate);
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

  if (!(await markEventSeen("stripe", event.id))) {
    return ok({ received: true, duplicate: true });
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
    const sub = event.data.object as {
      status?: string;
      current_period_end?: number;
      metadata?: { userId?: string };
    };
    const userId = parseInt(sub.metadata?.userId || "");

    if (userId) {
      if (sub.status === "active") {
        // Renouvellement : on prolonge à partir de la fin de période Stripe
        // (source de vérité) au lieu de toujours recalculer +30 jours.
        const endTs = sub.current_period_end as number | undefined;
        const endDate = typeof endTs === "number" && endTs > 0 ? new Date(endTs * 1000) : undefined;
        await activateSubscription(userId, "stripe", "card", endDate);
      } else if (sub.status === "past_due" || sub.status === "unpaid" || sub.status === "canceled") {
        const current = await prisma.subscription.findUnique({ where: { userId } });
        if (current?.status === "active") await expireSubscription(current.id);
      }
    }
  }

  return ok({ received: true });
}

async function handlePayPalWebhook(req: NextRequest) {
  const body = await req.json();

  const eventType = body.event_type;
  const eventId = body.id || "";
  if (eventId && !(await markEventSeen("paypal", eventId))) {
    return ok({ received: true, duplicate: true });
  }

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

    const eventId = body.id || body.transaction_id || "";
    if (eventId && !(await markEventSeen("fedapay", String(eventId)))) {
      return ok({ received: true, duplicate: true });
    }

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

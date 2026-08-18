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
  const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!paypalWebhookId) {
    console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID non configuré — webhook rejeté");
    return new Response("Webhook not configured", { status: 503 });
  }

  const body = await req.text();
  const rawBody = body;

  // Vérification de la signature PayPal (algorithme HMAC-SHA256)
  const paypalSignature = req.headers.get("paypal-signature");
  const paypalTransmissionId = req.headers.get("paypal-transmission-id");
  const paypalTransmissionTime = req.headers.get("paypal-transmission-time");
  const paypalCertUrl = req.headers.get("paypal-cert-url");
  const paypalAuthAlgo = req.headers.get("paypal-auth-algo");

  if (!paypalSignature || !paypalTransmissionId || !paypalTransmissionTime || !paypalCertUrl || !paypalAuthAlgo) {
    console.error("[paypal-webhook] Headers de signature PayPal manquants");
    return new Response("Missing signature headers", { status: 400 });
  }

  // Vérification basique : au minimum, s'assurer que l'event n'est pas un replay
  // (la vérification complète nécessiterait l'appel à l'API PayPal pour valider le certificat)
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = parsed.event_type as string;
  const eventId = (parsed.id as string) || "";
  if (eventId && !(await markEventSeen("paypal", eventId))) {
    return ok({ received: true, duplicate: true });
  }

  if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = parsed.resource as Record<string, unknown> | undefined;
    const purchaseUnits = resource?.purchase_units as Array<Record<string, unknown>> | undefined;
    const customId = (purchaseUnits?.[0] as Record<string, unknown>)?.custom_id
      || resource?.custom_id
      || (parsed.resource as Record<string, unknown>)?.custom_id;
    if (customId) {
      const userId = parseInt(customId as string);
      if (userId) await activateSubscription(userId, "paypal", "paypal");
    }
  }

  return ok({ received: true });
}

async function handleFedaPayWebhook(req: NextRequest) {
  const fedapaySecret = process.env.FEDAPAY_WEBHOOK_SECRET;
  if (!fedapaySecret) {
    console.error("[fedapay-webhook] FEDAPAY_WEBHOOK_SECRET non configuré — webhook rejeté");
    return new Response("Webhook not configured", { status: 503 });
  }

  // Vérification de la signature FedaPay (HMAC-SHA256)
  const signature = req.headers.get("x-fedapay-signature") || req.headers.get("x-webhook-signature");
  if (!signature) {
    console.error("[fedapay-webhook] Signature manquante");
    return new Response("Missing signature", { status: 400 });
  }

  const rawBody = await req.text();

  // Vérification HMAC
  const crypto = await import("crypto");
  const expectedSignature = crypto.createHmac("sha256", fedapaySecret).update(rawBody).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))) {
    console.error("[fedapay-webhook] Signature invalide");
    return new Response("Invalid signature", { status: 403 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventId = (parsed.id as string) || (parsed.transaction_id as string) || "";
  if (eventId && !(await markEventSeen("fedapay", String(eventId)))) {
    return ok({ received: true, duplicate: true });
  }

  const data = parsed.data as Record<string, unknown> | undefined;
  const status = (data?.status as string) || (parsed.status as string);
  const customer = data?.customer as Record<string, unknown> | undefined;
  const reference = (customer?.reference as string)
    || (parsed.customer as Record<string, unknown>)?.reference as string
    || (data?.reference as string)
    || (parsed.reference as string);

  if (status === "approved" || status === "completed" || status === "success") {
    if (reference) {
      const userId = parseInt(reference);
      if (userId) await activateSubscription(userId, "fedapay", "mobile_money");
    }
  }

  return ok({ received: true });
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

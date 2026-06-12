import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(STRIPE_SECRET_KEY || "");
  }
  return stripe;
}

export function hasStripe(): boolean {
  return Boolean(STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== "sk_test_xxxx");
}

export function getWebhookSecret(): string {
  return STRIPE_WEBHOOK_SECRET || "";
}

export async function createPaymentIntent(amount: number, currency: string, userId: number) {
  const s = getStripe();
  return s.paymentIntents.create({
    amount,
    currency,
    metadata: { userId: String(userId) },
    automatic_payment_methods: { enabled: true },
  });
}

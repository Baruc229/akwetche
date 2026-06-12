import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { unauthorized, badRequest, ok } from "@/lib/api";
import { createPaymentIntent, hasStripe } from "@/lib/stripe";

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

  if (!hasStripe()) {
    return ok({ clientSecret: null, message: "Mode démo — pas de paiement configuré" });
  }

  const isXOF = user.currency === "XOF" || user.currency === "FCFA";
  const amount = isXOF ? 5000 : 799;
  const currency = isXOF ? "xof" : "eur";

  const paymentIntent = await createPaymentIntent(amount, currency, userId);

  return ok({ clientSecret: paymentIntent.client_secret });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";
import { ALLOWED_COUNTRY_CODES, getCurrencyForCountry, getPhonePrefix, validatePhone, getCountryByCode } from "@/lib/currency";

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { name, initialBalance, initialBalanceActivity, currency, adminNotificationPref, phone, countryCode } = await req.json();

    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) return badRequest("Utilisateur introuvable");

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (initialBalance !== undefined) updateData.initialBalance = parseFloat(initialBalance);
    if (initialBalanceActivity !== undefined) updateData.initialBalanceActivity = parseFloat(initialBalanceActivity);
    if (currency !== undefined) updateData.currency = currency || "XOF";
    if (phone !== undefined) updateData.phone = phone;
    if (adminNotificationPref !== undefined) updateData.adminNotificationPref = adminNotificationPref;

    if (countryCode !== undefined) {
      if (!ALLOWED_COUNTRY_CODES.includes(countryCode)) {
        return badRequest("Ce pays n'est pas supporté");
      }
      if (current.countryCode && current.countryCode !== countryCode) {
        return badRequest("Le pays ne peut plus être modifié une fois défini");
      }
      updateData.countryCode = countryCode;
      const deducedCurrency = getCurrencyForCountry(countryCode);
      if (!current.baseCurrency) {
        updateData.baseCurrency = deducedCurrency;
      }
      if (!current.currency || current.currency === "auto") {
        updateData.currency = deducedCurrency;
      }
      if (!current.phone && phone === undefined) {
        const prefix = getPhonePrefix(countryCode);
        updateData.phone = prefix;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const currencyVal = user.currency || user.baseCurrency || "XOF";
    return ok({
      user: {
        id: user.id, name: user.name, email: user.email,
        initialBalance: user.initialBalance, initialBalanceActivity: user.initialBalanceActivity,
        currency: currencyVal, baseCurrency: user.baseCurrency || "XOF",
        role: user.role, adminNotificationPref: user.adminNotificationPref,
        countryCode: user.countryCode, phone: user.phone,
      },
    });
  } catch {
    return badRequest("Non autorisé");
  }
}

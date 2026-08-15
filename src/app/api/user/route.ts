import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";
import { ALLOWED_COUNTRY_CODES, getCurrencyForCountry, getPhonePrefix, validatePhone, validatePhoneMessage, validateName } from "@/lib/currency";

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { name, initialBalance, initialBalanceActivity, currency, adminNotificationPref, phone, countryCode, onboardingCompleted, avatarUrl, notificationPrefs, tontineAccess, recoitCommissions, commissionScopeDefault } = await req.json();

    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) return badRequest("Utilisateur introuvable");

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      const nameErr = validateName(name);
      if (nameErr) return badRequest(nameErr);
      updateData.name = name;
    }
    if (initialBalance !== undefined) {
      const balance = parseFloat(String(initialBalance));
      if (!Number.isFinite(balance) || balance < -1e12 || balance > 1e12) return badRequest("Solde initial invalide");
      updateData.initialBalance = Math.round(balance * 100) / 100;
    }
    if (initialBalanceActivity !== undefined) {
      const balance = parseFloat(String(initialBalanceActivity));
      if (!Number.isFinite(balance) || balance < -1e12 || balance > 1e12) return badRequest("Solde d'activité initial invalide");
      updateData.initialBalanceActivity = Math.round(balance * 100) / 100;
    }
    if (currency !== undefined) {
      if (!["XOF", "EUR"].includes(currency)) return badRequest("Devise invalide");
      updateData.currency = currency || "XOF";
    }
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;
    if (avatarUrl !== undefined) {
      if (typeof avatarUrl !== "string" || avatarUrl.length > 2048 || !/^https?:\/\//.test(avatarUrl)) {
        return badRequest("URL d'avatar invalide");
      }
      updateData.avatarUrl = avatarUrl;
    }
    if (notificationPrefs !== undefined) updateData.notificationPrefs = notificationPrefs;
    if (phone !== undefined) {
      if (phone && current.countryCode && !validatePhone(current.countryCode, phone)) {
        const phoneErr = validatePhoneMessage(current.countryCode, phone);
        return badRequest(phoneErr || "Format de téléphone invalide");
      }
      updateData.phone = phone;
    }
    if (adminNotificationPref !== undefined) updateData.adminNotificationPref = adminNotificationPref;
    if (tontineAccess !== undefined) updateData.tontineAccess = Boolean(tontineAccess);
    if (recoitCommissions !== undefined) updateData.recoitCommissions = Boolean(recoitCommissions);
    if (commissionScopeDefault !== undefined) {
      if (!["personnel", "activite"].includes(commissionScopeDefault)) return badRequest("Portée de commission invalide");
      updateData.commissionScopeDefault = commissionScopeDefault;
    }

    const isAdmin = current.role === "super_admin" || current.role === "admin";

    if (countryCode !== undefined) {
      if (!ALLOWED_COUNTRY_CODES.includes(countryCode)) {
        return badRequest("Ce pays n'est pas supporté");
      }
      if (current.countryCode && current.countryCode !== countryCode && !isAdmin) {
        return badRequest("Le pays ne peut plus être modifié une fois défini");
      }
      updateData.countryCode = countryCode;
      const deducedCurrency = getCurrencyForCountry(countryCode);
      updateData.baseCurrency = deducedCurrency;
      if (!updateData.currency || updateData.currency === "auto") {
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
    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id }, select: { status: true, amount: true, currency: true, endDate: true } });
    return ok({
      user: {
        id: user.id, name: user.name, email: user.email,
        initialBalance: user.initialBalance, initialBalanceActivity: user.initialBalanceActivity,
        currency: currencyVal, baseCurrency: user.baseCurrency || "XOF",
        role: user.role, plan: user.plan, status: user.status,
        adminNotificationPref: user.adminNotificationPref,
        countryCode: user.countryCode, phone: user.phone,
        avatarUrl: user.avatarUrl, onboardingCompleted: user.onboardingCompleted,
        notificationPrefs: user.notificationPrefs,
        emailVerified: user.emailVerified, activityActivated: user.activityActivated,
        tontineAccess: user.tontineAccess, recoitCommissions: user.recoitCommissions, commissionScopeDefault: user.commissionScopeDefault,
        subscription,
      },
    });
  } catch {
    return badRequest("Non autorisé");
  }
}

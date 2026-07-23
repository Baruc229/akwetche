"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faShield, faCheck, faLock, faUpRightFromSquare, faTriangleExclamation, faCircleCheck, faXmark, faStar, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../layout";
import SettingsHeader from "@/components/settings/SettingsHeader";

const ALL_FEATURES = [
  { key: "transactions", label: "Transactions illimitées", free: false },
  { key: "categories", label: "Catégories illimitées", free: false },
  { key: "activity", label: "Mode activité commerciale", free: false },
  { key: "products", label: "Gestion des produits, ventes et stocks", free: false },
  { key: "reports", label: "Bilans hebdo / mensuel / annuel", free: true },
  { key: "stats", label: "Statistiques avancées", free: false },
];

/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect, react-hooks/refs */
export default function AbonnementPage() {
  const { user, currency: activeCurrency } = useDashboard();
  const router = useRouter();
  const [subscription, setSubscription] = useState<{ status: string; amount: number; currency: string; endDate: string } | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<"success" | "error" | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const nowRef = useRef(Date.now());

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const monthlyDisplay = activeCurrency === "XOF" ? "5 000" : "7,99";
  const yearlyDisplay = activeCurrency === "XOF" ? "50 000" : "79,99";
  const yearlySavings = activeCurrency === "XOF" ? "~2 mois offerts" : "Économisez 2 mois";

  async function loadSubscription() {
    try {
      const res = await fetch("/api/payments/manage-subscription");
      const data = await res.json();
      setSubscription(data.subscription);
    } catch {}
  }

  useEffect(() => {
    document.title = "Abonnement — Akwetche";
    loadSubscription();
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      setPaymentMessage("Paiement réussi ! Votre abonnement Premium est maintenant actif.");
      setPaymentType("success");
      loadSubscription();
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
      setTimeout(() => { setPaymentMessage(null); setPaymentType(null); }, 6000);
    } else if (payment === "cancelled") {
      setPaymentMessage("Paiement annulé. Vous pouvez réessayer quand vous voulez.");
      setPaymentType("error");
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
      setTimeout(() => { setPaymentMessage(null); setPaymentType(null); }, 6000);
    }
  }, []);

  async function handleSubscribe(period: "monthly" | "yearly") {
    setSubLoading(true);
    setSubError("");
    try {
      router.push(`/payment?period=${period}`);
    } catch {
      setSubError("Erreur de redirection. Réessayez.");
      setSubLoading(false);
    }
  }

  const isActive = subscription?.status === "active" || user?.plan === "premium";
  const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - nowRef.current) / (1000 * 60 * 60 * 24))) : null;
  const isExpiringSoon = isActive && daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = subscription?.status === "expired" || (daysRemaining !== null && daysRemaining <= 0);
  const isCancelled = subscription?.status === "cancelled" && isActive;

  function renderPlan() {
    if (isActive && !isExpired) {
      return (
        <div className="space-y-4">
          {/* Current plan card */}
          <div className="card" style={{ border: isExpiringSoon ? "2px solid var(--color-warn)" : "2px solid var(--color-gold)", background: "linear-gradient(135deg, var(--color-warn-bg) 0%, var(--color-gold-light) 100%)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: isExpiringSoon ? "rgba(245,158,11,0.15)" : "rgba(201,168,76,0.2)" }}>
                  <FontAwesomeIcon icon={faCrown} className="w-6 h-6" style={{ color: isExpiringSoon ? "var(--color-warn)" : "var(--color-gold-dark)" }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-ink">Premium</p>
                  <p className="text-sm text-muted">Toutes les fonctionnalités débloquées</p>
                </div>
              </div>
              <span className="badge" style={isExpiringSoon ? { background: "rgba(245,158,11,0.15)", color: "var(--color-warn)" } : isCancelled ? { background: "rgba(107,114,128,0.12)", color: "var(--color-muted)" } : { background: "rgba(34,197,94,0.12)", color: "var(--color-pos)" }}>
                {isCancelled ? "Annulé" : isExpiringSoon ? "Expire bientôt" : "Actif"}
              </span>
            </div>

            {isExpiringSoon && (
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "rgba(245,158,11,0.12)" }}>
                <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 shrink-0" style={{ color: "var(--color-warn)" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-warn)" }}>Votre abonnement expire dans {daysRemaining} jour{daysRemaining! > 1 ? "s" : ""}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-warn)" }}>Renouvelez pour continuer à profiter de toutes les fonctionnalités.</p>
                </div>
              </div>
            )}

            <p className="text-sm text-muted mb-4">
              {subscription && `${activeCurrency === "XOF" ? "5 000 FCFA" : "7,99 €"} / mois`}
              {endDate && ` · Renouvellement le ${endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
              {isCancelled && ` · Accès maintenu jusqu'au ${endDate?.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {ALL_FEATURES.map((f) => (
                <div key={f.key} className="flex items-center gap-2 text-sm text-ink">
                  <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: "var(--color-pos)" }} />
                  {f.label}
                </div>
              ))}
            </div>

            <button onClick={() => handleSubscribe("monthly")} disabled={subLoading} className="btn-primary" style={isExpiringSoon ? { background: "var(--color-warn)" } : {}}>
              <FontAwesomeIcon icon={subLoading ? faSpinner : faUpRightFromSquare} className={`w-4 h-4 ${subLoading ? "animate-spin" : ""}`} />
              {subLoading ? "Chargement..." : isExpiringSoon ? "Renouveler maintenant" : "Gérer mon abonnement"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Billing period toggle */}
        <div className="flex items-center justify-center gap-1 p-1 rounded-xl" style={{ background: "var(--color-surface-raised)" }}>
          <button
            onClick={() => setBillingPeriod("monthly")}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: billingPeriod === "monthly" ? "white" : "transparent", color: billingPeriod === "monthly" ? "var(--color-ink)" : "var(--color-muted)", boxShadow: billingPeriod === "monthly" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: billingPeriod === "yearly" ? "white" : "transparent", color: billingPeriod === "yearly" ? "var(--color-ink)" : "var(--color-muted)", boxShadow: billingPeriod === "yearly" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
          >
            Annuel
            <span className="ml-1 text-xs font-semibold" style={{ color: "var(--color-pos)" }}>-17%</span>
          </button>
        </div>

        {/* Free plan */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-brand-subtle)" }}>
                <FontAwesomeIcon icon={faStar} className="w-6 h-6" style={{ color: "var(--color-brand)" }} />
              </div>
              <div>
                <p className="text-lg font-bold text-ink">Gratuit</p>
                <p className="text-sm text-muted">Fonctionnalités de base</p>
              </div>
            </div>
            <span className="badge" style={{ background: "var(--color-surface-raised)", color: "var(--color-muted)" }}>Actuel</span>
          </div>

          <div className="space-y-2.5 mb-5">
            {ALL_FEATURES.map((f) => (
              <div key={f.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  {f.free ? (
                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: "var(--color-pos)" }} />
                  ) : (
                    <FontAwesomeIcon icon={faLock} className="w-4 h-4 shrink-0" style={{ color: "var(--color-muted)" }} />
                  )}
                  <span style={{ color: f.free ? "var(--color-ink)" : "var(--color-muted)" }}>{f.label}</span>
                </div>
                {!f.free && (
                  <span className="badge" style={{ background: "rgba(201,168,76,0.12)", color: "var(--color-warn)", fontSize: "11px" }}>Premium</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Premium plan */}
        <div className="card" style={{ border: "2px solid var(--color-gold)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.2)" }}>
              <FontAwesomeIcon icon={faCrown} className="w-6 h-6" style={{ color: "var(--color-gold-dark)" }} />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">Premium</p>
              <p className="text-sm text-muted">Tout débloqué</p>
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-bold" style={{ color: "var(--color-gold-dark)", fontFamily: "var(--font-dm-sans)" }}>
              {billingPeriod === "monthly" ? monthlyDisplay : yearlyDisplay}
            </span>
            <span className="text-sm font-medium text-muted">
              {activeCurrency === "XOF" ? "FCFA" : "€"}/{billingPeriod === "monthly" ? "mois" : "an"}
            </span>
          </div>
          {billingPeriod === "yearly" && (
            <p className="text-xs font-medium mb-4" style={{ color: "var(--color-pos)" }}>
              {yearlySavings}
            </p>
          )}
          {billingPeriod === "monthly" && <div className="mb-4" />}

          <div className="space-y-2.5 mb-5">
            {ALL_FEATURES.filter(f => !f.free).map((f) => (
              <div key={f.key} className="flex items-center gap-2.5 text-sm">
                <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: "var(--color-pos)" }} />
                <span className="text-ink">{f.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleSubscribe(billingPeriod)}
            disabled={subLoading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all text-white"
            style={{ background: "var(--color-gold)" }}
          >
            {subLoading ? <><FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin mr-2" />Chargement...</> : `Passer au Premium ${billingPeriod === "monthly" ? "mensuel" : "annuel"}`}
          </button>
          {subError && <p className="mt-2 text-sm text-neg">{subError}</p>}
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-6 py-3">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <FontAwesomeIcon icon={faShield} className="w-3.5 h-3.5" />
            Paiement sécurisé
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
            Annulation libre
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <SettingsHeader title="Abonnement" subtitle="Gérez votre plan et vos fonctionnalités" />

      {isAdmin ? (
        <div className="card-hero">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
                <FontAwesomeIcon icon={faShield} className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Administrateur</p>
                <p className="text-sm text-white/70">Accès total — toutes les fonctionnalités débloquées</p>
              </div>
            </div>
            <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>Admin</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ALL_FEATURES.map((f) => (
              <div key={f.key} className="flex items-center gap-2 text-sm text-white">
                <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-white/70 shrink-0" />
                {f.label}
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-white">
              <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-white/70 shrink-0" />
              Accès panneau d&apos;administration
            </div>
          </div>
        </div>
      ) : renderPlan()}

      {paymentMessage && (
        <div className={`alert-inline animate-fade-in ${paymentType === "success" ? "pos" : "warn"}`}>
          <FontAwesomeIcon icon={paymentType === "success" ? faCircleCheck : faXmark} className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{paymentMessage}</span>
        </div>
      )}
    </div>
  );
}

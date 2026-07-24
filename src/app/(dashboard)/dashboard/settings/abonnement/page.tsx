"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faShield, faCheck, faLock, faUpRightFromSquare, faTriangleExclamation, faCircleCheck, faXmark, faStar, faSpinner, faArrowRight, faCalendarDay, faClock, faHeadset, faEnvelope, faChartLine, faLayerGroup, faBuilding, faBoxOpen, faFileLines, faChartPie } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../layout";
import SettingsHeader from "@/components/settings/SettingsHeader";

const PREMIUM_FEATURES = [
  { key: "transactions", label: "Transactions illimitées", desc: "Aucune limite sur le nombre de transactions", icon: faArrowRight, free: false },
  { key: "categories", label: "Catégories illimitées", desc: "Créez autant de catégories que nécessaire", icon: faLayerGroup, free: false },
  { key: "activity", label: "Mode activité commerciale", desc: "Gérez vos activités pro et perso séparément", icon: faBuilding, free: false },
  { key: "products", label: "Produits, ventes et stocks", desc: "Gestion complète de votre inventaire", icon: faBoxOpen, free: false },
  { key: "reports", label: "Bilans avancés", desc: "Rapports hebdo, mensuels et annuels", icon: faFileLines, free: true },
  { key: "stats", label: "Statistiques avancées", desc: "Graphiques et analyses détaillées", icon: faChartPie, free: false },
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
        <div className="space-y-5">
          {/* ─── HERO PREMIUM ─── */}
          <div className="rounded-2xl p-6 sm:p-7" style={{ background: "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #f0c75e 100%)", boxShadow: "0 8px 32px rgba(218,165,32,0.25)" }}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
                  <FontAwesomeIcon icon={faCrown} className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-dm-sans)" }}>Premium Actif</p>
                  <p className="text-sm text-white/70 mt-0.5">Toutes les fonctionnalités débloquées</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.25)", color: "#dcfce7" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                {isCancelled ? "Annulé" : "Actif"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}>
                <FontAwesomeIcon icon={faCalendarDay} className="w-4 h-4 text-white/60 mb-1.5" />
                <p className="text-xs text-white/60">Renouvellement</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {endDate ? endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}>
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-white/60 mb-1.5" />
                <p className="text-xs text-white/60">Jours restants</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {daysRemaining !== null ? `${daysRemaining}j` : "—"}
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}>
                <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-white/60 mb-1.5" />
                <p className="text-xs text-white/60">Fonctionnalités</p>
                <p className="text-sm font-semibold text-white mt-0.5">{PREMIUM_FEATURES.length}/{PREMIUM_FEATURES.length}</p>
              </div>
            </div>
          </div>

          {isExpiringSoon && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "var(--color-warn-bg)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 shrink-0" style={{ color: "var(--color-warn)" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-warn)" }}>Expire dans {daysRemaining} jour{daysRemaining! > 1 ? "s" : ""}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-warn)" }}>Renouvelez pour ne pas perdre l&apos;accès.</p>
              </div>
            </div>
          )}

          {/* ─── FONCTIONNALITÉS ─── */}
          <div>
            <p className="text-label mb-3 px-1">Ce qui est inclus</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PREMIUM_FEATURES.map((f) => (
                <div key={f.key} className="card flex items-start gap-3.5 p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-brand-subtle)" }}>
                    <FontAwesomeIcon icon={f.icon} className="w-5 h-5" style={{ color: "var(--color-brand)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{f.label}</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── GESTION ─── */}
          <div>
            <p className="text-label mb-3 px-1">Gestion</p>
            <div className="space-y-3">
              <button onClick={() => handleSubscribe("monthly")} disabled={subLoading} className="btn-primary w-full" style={isExpiringSoon ? { background: "var(--color-warn)" } : {}}>
                <FontAwesomeIcon icon={subLoading ? faSpinner : faUpRightFromSquare} className={`w-4 h-4 ${subLoading ? "animate-spin" : ""}`} />
                {subLoading ? "Chargement..." : isExpiringSoon ? "Renouveler maintenant" : "Gérer mon abonnement"}
              </button>
              <div className="card flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-brand-subtle)" }}>
                  <FontAwesomeIcon icon={faHeadset} className="w-5 h-5" style={{ color: "var(--color-brand)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">Support prioritaire</p>
                  <p className="text-xs text-muted mt-0.5">Contactez-nous pour toute question</p>
                </div>
                <a href="mailto:support@akwetche.com" className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ background: "var(--color-brand-subtle)" }}>
                  <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" style={{ color: "var(--color-brand)" }} />
                </a>
              </div>
            </div>
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
            {PREMIUM_FEATURES.map((f) => (
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
            {PREMIUM_FEATURES.filter(f => !f.free).map((f) => (
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
            {PREMIUM_FEATURES.map((f) => (
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

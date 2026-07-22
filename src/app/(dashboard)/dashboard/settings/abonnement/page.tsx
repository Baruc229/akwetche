"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faShield, faCheck, faLock, faUpRightFromSquare, faTriangleExclamation, faCircleCheck, faXmark, faStar } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../layout";
import { formatCurrency } from "@/lib/utils";

const ALL_FEATURES = [
  { key: "transactions", label: "Transactions illimitées", free: false },
  { key: "categories", label: "Catégories illimitées", free: false },
  { key: "activity", label: "Mode activité commerciale", free: false },
  { key: "products", label: "Gestion des produits, ventes et stocks", free: false },
  { key: "reports", label: "Bilans hebdo / mensuel / annuel", free: true },
  { key: "stats", label: "Statistiques avancées", free: false },
];

export default function AbonnementPage() {
  const { user, currency: activeCurrency } = useDashboard();
  const router = useRouter();
  const [subscription, setSubscription] = useState<{ status: string; amount: number; currency: string; endDate: string } | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<"success" | "error" | null>(null);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

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

  async function loadSubscription() {
    try {
      const res = await fetch("/api/payments/manage-subscription");
      const data = await res.json();
      setSubscription(data.subscription);
    } catch {}
  }

  async function handleSubscribe() {
    router.push("/payment");
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Abonnement</h1>
        <p className="text-muted text-sm mt-0.5">Gérez votre plan et vos fonctionnalités</p>
      </div>

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
      ) : (() => {
        const isActive = subscription?.status === "active" || user?.plan === "premium";
        const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
        const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
        const isExpiringSoon = isActive && daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
        const isExpired = subscription?.status === "expired" || (daysRemaining !== null && daysRemaining <= 0);
        const isCancelled = subscription?.status === "cancelled" && isActive;

        if (isActive && !isExpired) {
          return (
            <div className="card" style={{ border: isExpiringSoon ? "2px solid var(--color-warn, #F59E0B)" : "2px solid var(--color-gold, #C9A84C)", background: isExpiringSoon ? "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)" : "linear-gradient(135deg, #FFFBEB 0%, #FEF9C3 100%)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: isExpiringSoon ? "rgba(245,158,11,0.15)" : "rgba(201,168,76,0.2)" }}>
                    <FontAwesomeIcon icon={faCrown} className="w-6 h-6" style={{ color: isExpiringSoon ? "var(--color-warn, #D97706)" : "var(--color-gold, #B8860B)" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink">Premium</p>
                    <p className="text-sm text-muted">Toutes les fonctionnalités débloquées</p>
                  </div>
                </div>
                <span className="badge" style={isExpiringSoon ? { background: "rgba(245,158,11,0.15)", color: "#92400E" } : isCancelled ? { background: "rgba(107,114,128,0.12)", color: "#374151" } : { background: "rgba(34,197,94,0.12)", color: "#166534" }}>
                  {isCancelled ? "Annulé" : isExpiringSoon ? "Expire bientôt" : "Actif"}
                </span>
              </div>

              {isExpiringSoon && (
                <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "rgba(245,158,11,0.12)" }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 shrink-0" style={{ color: "var(--color-warn, #D97706)" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#92400E" }}>Votre abonnement expire dans {daysRemaining} jour{daysRemaining! > 1 ? "s" : ""}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#A16207" }}>Renouvelez pour continuer à profiter de toutes les fonctionnalités.</p>
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
                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: "#16A34A" }} />
                    {f.label}
                  </div>
                ))}
              </div>

              <button onClick={handleSubscribe} disabled={subLoading} className="btn-primary" style={isExpiringSoon ? { background: "var(--color-warn, #D97706)" } : {}}>
                <FontAwesomeIcon icon={faUpRightFromSquare} className="w-4 h-4" />
                {subLoading ? "Chargement..." : isExpiringSoon ? "Renouveler maintenant" : "Gérer mon abonnement"}
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-4">
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
                <span className="badge" style={{ background: "var(--color-surface-raised)", color: "var(--color-muted)" }}>Actif</span>
              </div>

              <div className="space-y-2.5 mb-5">
                {ALL_FEATURES.map((f) => (
                  <div key={f.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      {f.free ? (
                        <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: "#16A34A" }} />
                      ) : (
                        <FontAwesomeIcon icon={faLock} className="w-4 h-4 shrink-0" style={{ color: "var(--color-muted)" }} />
                      )}
                      <span style={{ color: f.free ? "var(--color-ink)" : "var(--color-muted)" }}>{f.label}</span>
                    </div>
                    {!f.free && (
                      <span className="badge" style={{ background: "rgba(201,168,76,0.12)", color: "#92400E", fontSize: "11px" }}>Premium</span>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={handleSubscribe} disabled={subLoading} className="btn-primary w-full">
                <FontAwesomeIcon icon={faCrown} className="w-4 h-4" />
                {subLoading ? "Chargement..." : "Passer au Premium →"}
              </button>
              {subError && <p className="mt-2 text-sm text-neg">{subError}</p>}
            </div>

            <div className="card" style={{ border: "2px solid var(--color-gold, #C9A84C)" }}>
              <p className="text-sm font-semibold text-ink mb-3">Premium</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold" style={{ color: "var(--color-gold, #B8860B)", fontFamily: "var(--font-dm-sans)" }}>
                  {activeCurrency === "XOF" ? "5 000" : "7,99"}
                </span>
                <span className="text-sm font-medium text-muted">
                  {activeCurrency === "XOF" ? "FCFA" : "€"}/mois
                </span>
              </div>
              <div className="space-y-2.5 mb-5">
                {ALL_FEATURES.filter(f => !f.free).map((f) => (
                  <div key={f.key} className="flex items-center gap-2.5 text-sm">
                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4 shrink-0" style={{ color: "#16A34A" }} />
                    <span className="text-ink">{f.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleSubscribe} disabled={subLoading} className="w-full py-3 rounded-xl text-sm font-semibold transition-all text-white" style={{ background: "linear-gradient(135deg, var(--color-gold, #C9A84C), #D4A843)" }}>
                {subLoading ? "Chargement..." : "Commencer maintenant"}
              </button>
            </div>
          </div>
        );
      })()}

      {paymentMessage && (
        <div className={`alert-inline animate-fade-in ${paymentType === "success" ? "pos" : "warn"}`}>
          <FontAwesomeIcon icon={paymentType === "success" ? faCircleCheck : faXmark} className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{paymentMessage}</span>
        </div>
      )}
    </div>
  );
}

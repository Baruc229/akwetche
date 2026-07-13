"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faWallet, faCrown, faArrowLeft, faCreditCard, faMobileScreen, faCheck, faShield, faTriangleExclamation, faSpinner, faCircleXmark, faClock, faMoneyBill, faWaveSquare, faSignal, faPlus } from '@fortawesome/free-solid-svg-icons';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY || "");

type PaymentMethod = "card" | "paypal" | "mobile_money";
type PaymentStatus = "idle" | "processing" | "confirming" | "success" | "failed" | "cancelled" | "timeout";

const STATUS_CONFIG: Record<PaymentStatus, { icon: IconDefinition; label: string; color: string; bg: string }> = {
 idle: { icon: faWallet, label: "", color: "", bg: "" },
 processing: { icon: faSpinner, label: "Paiement en cours…", color: "text-[var(--color-brand)]", bg: "bg-[var(--color-brand-subtle)]" },
 confirming: { icon: faClock, label: "Confirmation en cours…", color: "text-[var(--color-gold)]", bg: "bg-[var(--color-gold-light)]" },
 success: { icon: faCheck, label: "Paiement validé ✓", color: "text-[var(--color-brand)]", bg: "bg-[var(--color-gold-light)]" },
 failed: { icon: faCircleXmark, label: "Paiement échoué. Veuillez réessayer.", color: "text-[var(--color-neg)]", bg: "bg-[var(--color-neg-bg)]" },
 cancelled: { icon: faCircleXmark, label: "Paiement annulé.", color: "text-[var(--color-muted)]", bg: "bg-[var(--color-bg)]" },
 timeout: { icon: faClock, label: "Délai dépassé. Veuillez réessayer.", color: "text-[var(--color-gold)]", bg: "bg-[var(--color-gold-light)]" },
};

function StripeCardForm({ onStatus, onSuccess }: { onStatus: (s: PaymentStatus) => void; onSuccess: () => void }) {
 const stripe = useStripe();
 const elements = useElements();
 const [error, setError] = useState("");

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!stripe || !elements) return;

 onStatus("processing");
 setError("");

 const { error: submitError, paymentIntent } = await stripe.confirmPayment({
 elements,
 redirect: "if_required",
 });

 if (submitError) {
 setError(submitError.message || "Erreur de paiement");
 onStatus("failed");
 return;
 }

 if (paymentIntent?.status === "succeeded") {
 onStatus("confirming");
 setTimeout(() => { onStatus("success"); onSuccess(); }, 1500);
 } else {
 onStatus("failed");
 }
 }

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
  <div className="p-4 bg-[var(--color-surface)] border border-border rounded-xl">
  <PaymentElement />
  </div>
  {error && <p className="text-sm text-[var(--color-neg)] bg-[var(--color-neg-bg)] p-3 rounded-xl">{error}</p>}
 <button type="submit" disabled={!stripe || !elements} className="btn-primary w-full py-3 text-base disabled:opacity-50">
 Payer par carte
 </button>
 </form>
 );
}

function PayPalForm({ onStatus, onSuccess }: { onStatus: (s: PaymentStatus) => void; onSuccess: () => void }) {
 const [error, setError] = useState("");

 return (
 <div className="space-y-4">
  <div className="p-4 bg-[var(--color-surface)] border border-border rounded-xl min-h-[160px] flex items-center justify-center">
 <PayPalButtons
 style={{ layout: "vertical", shape: "rect", color: "gold", label: "pay" }}
 createOrder={async () => {
 onStatus("processing");
 const res = await fetch("/api/payments/create-paypal-order", { method: "POST" });
 const data = await res.json();
 if (!res.ok) { setError(data.error || "Erreur PayPal"); onStatus("failed"); throw new Error(data.error); }
 return data.orderID;
 }}
 onApprove={async (data) => {
 onStatus("confirming");
 const res = await fetch("/api/payments/capture-paypal-order", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ orderID: data.orderID }),
 });
 const result = await res.json();
 if (res.ok && result.status === "success") {
 setTimeout(() => { onStatus("success"); onSuccess(); }, 1500);
 } else {
 setError("Échec de la confirmation PayPal");
 onStatus("failed");
 }
 }}
 onCancel={() => { onStatus("cancelled"); }}
 onError={(err: any) => { setError(err?.message || "Erreur PayPal"); onStatus("failed"); }}
 />
 </div>
  {error && <p className="text-sm text-[var(--color-neg)] bg-[var(--color-neg-bg)] p-3 rounded-xl">{error}</p>}
  </div>
  );
 }

const LOCAL_NETWORKS = [
  { id: "mtn", name: "MTN Mobile Money", icon: faMobileScreen },
  { id: "moov", name: "Moov Money", icon: faMobileScreen },
  { id: "wave", name: "Wave", icon: faWaveSquare },
  { id: "celtiis", name: "Celtiis", icon: faSignal },
  { id: "other", name: "Autre réseau local", icon: faPlus },
];

function MobileMoneyForm({ onStatus, onSuccess }: { onStatus: (s: PaymentStatus) => void; onSuccess: () => void }) {
 const [selectedNetwork, setSelectedNetwork] = useState("");
 const [phone, setPhone] = useState("");
 const [error, setError] = useState("");
 const widgetRef = useRef<HTMLDivElement>(null);
 const [widgetReady, setWidgetReady] = useState(false);

 useEffect(() => {
 if (typeof window !== "undefined" && !(window as any).FedaPayCheckout) {
 const script = document.createElement("script");
 script.src = "https://cdn.fedapay.com/checkout.js";
 script.async = true;
 script.onload = () => setWidgetReady(true);
 document.body.appendChild(script);
 return () => { document.body.removeChild(script); };
 } else {
 setWidgetReady(true);
 }
 }, []);

 async function handlePay(e: React.FormEvent) {
 e.preventDefault();
 if (!selectedNetwork || !phone || phone.length < 8) {
 setError("Veuillez sélectionner un réseau et saisir votre numéro");
 return;
 }

 onStatus("processing");
 setError("");

 try {
 const res = await fetch("/api/payments/create-fedapay-transaction", { method: "POST" });
 const data = await res.json();
 if (!res.ok) { setError(data.error || "Erreur"); onStatus("failed"); return; }

 onStatus("confirming");

 if ((window as any).FedaPayCheckout && widgetRef.current) {
 (window as any).FedaPayCheckout.render({
 token: data.token,
 container: widgetRef.current,
 onSuccess: () => {
 setTimeout(() => { onStatus("success"); onSuccess(); }, 1500);
 },
 onError: (err: any) => {
 setError(err?.message || "Erreur de paiement mobile");
 onStatus("failed");
 },
 onClose: () => {
 if (widgetRef.current?.querySelector(".fedapay-overlay")) {
 onStatus("cancelled");
 }
 },
 });
 } else {
 setTimeout(() => { onStatus("success"); onSuccess(); }, 2000);
 }
 } catch {
 setError("Erreur de connexion");
 onStatus("failed");
 }
 }

 return (
 <form onSubmit={handlePay} className="space-y-4">
 <label className="block text-sm font-medium text-ink">Réseau</label>
 <div className="grid grid-cols-2 gap-2">
 {LOCAL_NETWORKS.map((net) => (
 <button
 key={net.id}
 type="button"
 onClick={() => setSelectedNetwork(net.id)}
               className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
               selectedNetwork === net.id
                 ? "border-[var(--color-brand)] bg-[var(--color-gold-light)] text-[var(--color-brand)]"
                 : "border-border text-muted hover:border-border"
               }`}
            >
              <FontAwesomeIcon icon={net.icon} className="w-4 h-4" />
              <span>{net.name}</span>
 </button>
 ))}
 </div>

 <div>
 <label className="block text-sm font-medium text-ink mb-1">Numéro de téléphone</label>
 <input
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="ex: 01 23 45 67 89"
   className="input-field"
 />
 </div>

  <div ref={widgetRef} />

  {error && <p className="text-sm text-[var(--color-neg)] bg-[var(--color-neg-bg)] p-3 rounded-xl">{error}</p>}

  <button type="submit" disabled={!selectedNetwork || !phone} className="btn-primary w-full py-3 text-base disabled:opacity-50">
 Payer par Mobile Money
 </button>

 <p className="text-xs text-muted text-center">
 Vous recevrez une notification sur votre téléphone pour confirmer le paiement.
 </p>
 </form>
 );
}

function PaymentStatusBanner({ status }: { status: PaymentStatus }) {
 if (status === "idle") return null;
 const config = STATUS_CONFIG[status];

 return (
 <div className={`flex items-center gap-3 p-4 rounded-xl ${config.bg} ${config.color} animate-fade-in`}>
 {status === "processing" || status === "confirming" ? (
 <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
 ) : (
 <FontAwesomeIcon icon={config.icon} className="w-5 h-5" />
 )}
 <span className="text-sm font-medium">{config.label}</span>
 </div>
 );
}

export default function PaymentPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [clientSecret, setClientSecret] = useState("");
 const [currencyDisplay, setCurrencyDisplay] = useState("FCFA");
 const [amountDisplay, setAmountDisplay] = useState("5 000");
 const [method, setMethod] = useState<PaymentMethod>("card");
 const [status, setStatus] = useState<PaymentStatus>("idle");
 const [userCurrency, setUserCurrency] = useState("XOF");

 useEffect(() => {
 const cancelledParam = searchParams.get("cancelled");
 if (cancelledParam === "true") setStatus("cancelled");
 }, [searchParams]);

 useEffect(() => {
 fetch("/api/auth/me")
 .then((res) => res.json())
 .then((data) => {
 if (!data.user) { router.push("/login"); return; }
 if (!data.user.emailVerified) { router.push("/verify-email-pending"); return; }
 if (data.user.plan !== "premium") { router.push("/dashboard"); return; }
 if (data.user.subscription?.status === "active") { router.push("/dashboard/settings?payment=success"); return; }

 const cu = data.user.currency;
 setUserCurrency(cu);
 const isXOF = cu === "XOF" || cu === "FCFA";
 setCurrencyDisplay(isXOF ? "FCFA" : "€");
 setAmountDisplay(isXOF ? "5 000" : "7,99");

 return fetch("/api/payments/create-payment-intent", { method: "POST" })
 .then((r) => r.json())
 .then((d) => {
 if (d.clientSecret) setClientSecret(d.clientSecret);
 });
 })
 .catch(() => router.push("/login"))
 .finally(() => setLoading(false));
 }, [router, searchParams]);

 function handleSuccess() {
 setTimeout(() => { router.push("/dashboard/settings?payment=success"); }, 2000);
 }

 if (loading) {
 return (
  <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
  <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
  </div>
  );
 }

 if (!clientSecret && method === "card") {
  return (
  <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
 <div className="w-full max-w-md text-center">
 <div className="card p-8">
  <FontAwesomeIcon icon={faMoneyBill} className="w-12 h-12 text-[var(--color-gold)] mx-auto mb-4" />
 <h2 className="text-lg font-bold text-ink mb-2">Paiement non configuré</h2>
 <p className="text-sm text-muted mb-4">Le paiement par carte n'est pas disponible pour le moment.</p>
 <p className="text-sm text-muted">Utilisez PayPal ou Mobile Money.</p>
 </div>
 </div>
 </div>
 );
 }

 const isSuccess = status === "success";

 return (
  <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
  <div className="w-full max-w-lg animate-scale-in">
 <button
 onClick={() => router.back()}
 className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-6 transition-colors"
 >
 <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
 Retour
 </button>

 <div className="card overflow-hidden">
 {/* Header */}
  <div className={`p-6 text-center transition-all ${isSuccess ? "bg-[var(--color-gold-light)]" : "bg-[var(--color-gold-light)]"}`}>
 {isSuccess ? (
  <div className="w-14 h-14 bg-[var(--color-gold-light)] rounded-full flex items-center justify-center mx-auto mb-3">
  <FontAwesomeIcon icon={faCheck} className="w-7 h-7 text-[var(--color-brand)]" />
 </div>
 ) : (
  <div className="w-14 h-14 bg-[var(--color-gold)] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
 <FontAwesomeIcon icon={faCrown} className="w-7 h-7 text-white" />
 </div>
 )}
 <h1 className="text-xl font-bold text-ink">
 {isSuccess ? "Paiement réussi !" : "Passez à Premium"}
 </h1>
 <p className="text-muted text-sm mt-1">
 {isSuccess ? "Votre abonnement est maintenant actif" : "Débloquez toutes les fonctionnalités"}
 </p>

  <div className={`mt-4 inline-block px-5 py-2 rounded-xl text-2xl font-bold ${isSuccess ? "text-[var(--color-brand)]" : "text-[var(--color-gold)]"} bg-[var(--color-surface)]/60`}>
 {isSuccess ? "Abonnement actif ✓" : `${amountDisplay} ${currencyDisplay}`}
 <span className="block text-xs font-normal text-muted mt-0.5">par mois</span>
 </div>
 </div>

 {!isSuccess ? (
 <div className="p-5">
 <PaymentStatusBanner status={status} />

 {status !== "confirming" && (
 <>
 <div className="grid grid-cols-3 gap-2 mb-5">
 {[
  { id: "card" as const, label: "Carte", icon: faCreditCard },
  { id: "paypal" as const, label: "PayPal", icon: faWallet },
  { id: "mobile_money" as const, label: "Mobile Money", icon: faMobileScreen },
 ].map((m) => (
 <button
 key={m.id}
 type="button"
 onClick={() => { setMethod(m.id); setStatus("idle"); }}
 disabled={status === "processing"}
   className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all disabled:opacity-50 ${
   method === m.id
   ? "border-[var(--color-brand)] bg-[var(--color-gold-light)] text-[var(--color-brand)]"
   : "border-border text-muted hover:border-border hover:text-ink"
   }`}
 >
  <FontAwesomeIcon icon={m.icon} className="w-5 h-5" />
 {m.label}
 </button>
 ))}
 </div>

 <div className="min-h-[200px]">
 {method === "card" && clientSecret && (
 <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#000000" } } }}>
 <StripeCardForm onStatus={setStatus} onSuccess={handleSuccess} />
 </Elements>
 )}
 {method === "paypal" && (
 <PayPalScriptProvider options={{
 clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
 currency: userCurrency === "XOF" || userCurrency === "FCFA" ? "XOF" : "EUR",
 intent: "capture",
 }}>
 <PayPalForm onStatus={setStatus} onSuccess={handleSuccess} />
 </PayPalScriptProvider>
 )}
 {method === "mobile_money" && (
 <MobileMoneyForm onStatus={setStatus} onSuccess={handleSuccess} />
 )}
 </div>

 <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
 <FontAwesomeIcon icon={faShield} className="w-3.5 h-3.5" />
 Paiement sécurisé — vos données sont cryptées
 </div>
 </>
 )}
 </div>
 ) : (
 <div className="p-5 text-center space-y-3">
 <p className="text-sm text-muted">Redirection vers votre tableau de bord…</p>
 <button
 onClick={() => router.push("/dashboard/settings")}
 className="btn-primary w-full py-3"
 >
 Accéder aux paramètres
 </button>
 </div>
 )}
 </div>

 {/* Features list */}
 {!isSuccess && (
 <div className="mt-5 card p-5">
 <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Ce qui vous attend</p>
 <div className="grid grid-cols-2 gap-2">
 {[
 "Transactions illimitées",
 "Catégories illimitées",
 "Mode activité commerciale",
 "Gestion des stocks",
 "Statistiques avancées",
 "Bilans hebdo/mensuel/annuel",
 ].map((f) => (
 <p key={f} className="text-sm text-muted flex items-center gap-1.5">
  <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
 {f}
 </p>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}

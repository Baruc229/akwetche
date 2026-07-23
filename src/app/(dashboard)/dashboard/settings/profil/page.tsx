"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faCamera, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../layout";
import { resolveCurrency, setActiveCurrency, getCountryByCode, getPhonePrefix, COUNTRY_OPTIONS, validatePhoneMessage, validateName, toDisplayCurrency, toStorageCurrency, roundByCurrency, type CurrencyCode } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import FlagImg from "@/components/ui/FlagImg";
import SettingsHeader from "@/components/settings/SettingsHeader";
import UserAvatar from "@/components/settings/UserAvatar";

export default function ProfilPage() {
  const { user, setUser, setCurrency: setDashboardCurrency } = useDashboard();
  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.currency || getCountryByCode(user?.countryCode || "")?.currency || "XOF");
  const [initialBalance, setInitialBalance] = useState(() => {
    const dc = currency as CurrencyCode;
    return String(roundByCurrency(toDisplayCurrency(user?.initialBalance || 0, dc), dc));
  });
  const [initialBalanceActivity, setInitialBalanceActivity] = useState(() => {
    const dc = currency as CurrencyCode;
    return String(roundByCurrency(toDisplayCurrency(user?.initialBalanceActivity || 0, dc), dc));
  });
  const baseBalanceRef = useRef(user?.initialBalance || 0);
  const baseActivityRef = useRef(user?.initialBalanceActivity || 0);
  const prevCurrencyRef = useRef(currency);
  const [countryCode, setCountryCode] = useState(user?.countryCode || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saved, setSaved] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAvatar = useCallback(async (file: File) => {
    setAvatarError("");
    // Validate format
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Format non supporté (JPEG, PNG, WebP uniquement)");
      return;
    }
    // Validate size
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image trop lourde (max 2 Mo)");
      return;
    }
    setAvatarLoading(true);
    try {
      const bmp = await createImageBitmap(file);
      // Validate dimensions
      if (bmp.width < 200 || bmp.height < 200) {
        setAvatarError("Dimensions trop petites (min 200×200)");
        setAvatarLoading(false);
        return;
      }
      // Crop centered square + resize 256×256
      const size = Math.min(bmp.width, bmp.height);
      const sx = (bmp.width - size) / 2;
      const sy = (bmp.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bmp, sx, sy, size, size, 0, 0, 256, 256);
      bmp.close();
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Erreur canvas")), "image/webp", 0.85);
      });
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      // Upload
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: base64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error || "Erreur lors de l'upload");
        return;
      }
      // Update local user state
      setUser({ ...user!, avatarUrl: data.avatarUrl });
    } catch {
      setAvatarError("Erreur réseau, réessayez");
    } finally {
      setAvatarLoading(false);
    }
  }, [user, setUser]);

  async function handleDeleteAvatar() {
    setAvatarLoading(true);
    setAvatarError("");
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (res.ok) {
        setUser({ ...user!, avatarUrl: null });
      }
    } catch {
      setAvatarError("Erreur lors de la suppression");
    } finally {
      setAvatarLoading(false);
    }
  }

  useEffect(() => { document.title = "Profil — Akwetche"; }, []);

  useEffect(() => {
    const prev = prevCurrencyRef.current;
    if (prev !== currency) {
      const to = currency as CurrencyCode;
      const baseVal = baseBalanceRef.current;
      const newDisplay = roundByCurrency(toDisplayCurrency(baseVal, to), to);
      setInitialBalance(String(newDisplay));
      const baseActVal = baseActivityRef.current;
      const newActDisplay = roundByCurrency(toDisplayCurrency(baseActVal, to), to);
      setInitialBalanceActivity(String(newActDisplay));
      prevCurrencyRef.current = currency;
    }
  }, [currency]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");
    setPhoneError("");

    const nameErr = validateName(name);
    if (nameErr) { setNameError(nameErr); return; }
    if (phone && countryCode) {
      const phoneErr = validatePhoneMessage(countryCode, phone);
      if (phoneErr) { setPhoneError(phoneErr); return; }
    }

    const balanceInBase = baseBalanceRef.current;
    const activityInBase = baseActivityRef.current;

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          initialBalance: balanceInBase,
          initialBalanceActivity: activityInBase,
          currency,
          phone,
          ...(countryCode ? { countryCode } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setActiveCurrency(resolveCurrency(data.user?.currency));
        const updatedDc = resolveCurrency(data.user?.currency) as CurrencyCode;
        setInitialBalance(String(roundByCurrency(toDisplayCurrency(balanceInBase, updatedDc), updatedDc)));
        setInitialBalanceActivity(String(roundByCurrency(toDisplayCurrency(activityInBase, updatedDc), updatedDc)));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) { console.error(e); setNameError("Erreur réseau lors de la sauvegarde"); }
  }

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <SettingsHeader title="Informations sur le compte" subtitle="Nom, soldes initiaux, pays, devise" />

      <div className="card">
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-4 mb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="lg" loading={avatarLoading} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink mb-1">Photo de profil</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
              >
                <FontAwesomeIcon icon={faCamera} className="w-3 h-3" />
                {user?.avatarUrl ? "Changer" : "Ajouter"}
              </button>
              {user?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={avatarLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: "var(--color-neg-bg)", color: "var(--color-neg)" }}
                >
                  <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                  Supprimer
                </button>
              )}
            </div>
            {avatarError && <p className="text-neg text-xs mt-1.5">{avatarError}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processAvatar(file);
              e.target.value = "";
            }}
          />
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="field-label">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              className={`input-field ${nameError ? "error" : ""}`}
              placeholder="Votre nom"
              required
            />
            {nameError && <p className="text-neg text-xs mt-1">{nameError}</p>}
          </div>
          <div>
            <label className="field-label">Argent de départ</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
              <input type="number" value={initialBalance} onChange={(e) => { setInitialBalance(e.target.value); const v = parseFloat(e.target.value) || 0; const dc = currency as CurrencyCode; baseBalanceRef.current = toStorageCurrency(v, dc); }} className="input-field pl-16" placeholder="0" min="0" step="any" />
            </div>
            <p className="text-xs text-muted mt-1">Ce que vous aviez avant de commencer.</p>
          </div>
          {user?.plan === "premium" && (
            <div>
              <label className="field-label">Argent de départ (activité)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">{currency === "XOF" ? "FCFA" : "EUR"}</span>
                <input type="number" value={initialBalanceActivity} onChange={(e) => { setInitialBalanceActivity(e.target.value); const v = parseFloat(e.target.value) || 0; const dc = currency as CurrencyCode; baseActivityRef.current = toStorageCurrency(v, dc); }} className="input-field pl-16" placeholder="0" min="0" step="any" />
              </div>
              <p className="text-xs text-muted mt-1">Ce que vous aviez dans votre activité.</p>
            </div>
          )}
          {/* Pays + Téléphone — 2 colonnes dès 768px */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Pays</label>
              {user?.countryCode && !isAdmin ? (
                <div className="flex items-center gap-2 input-field bg-sand text-muted cursor-not-allowed opacity-80">
                  <FlagImg code={user.countryCode} />
                  <span className="truncate">{getCountryByCode(user.countryCode)?.name || user.countryCode}</span>
                  <span className="text-xs text-muted ml-auto shrink-0">Non modifiable</span>
                </div>
              ) : (
                <CustomSelect
                  options={COUNTRY_OPTIONS}
                  value={countryCode}
                  onChange={(v) => { setCountryCode(v); setCurrency(getCountryByCode(v)?.currency || "XOF"); if (!user?.countryCode) setPhone(getPhonePrefix(v)); }}
                  placeholder="Sélectionnez votre pays"
                />
              )}
              <p className="text-xs text-muted mt-1">Devise : <strong>{getCountryByCode(countryCode)?.currency || currency}</strong></p>
            </div>
            <div>
              <label className="field-label">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (countryCode) {
                    const prefix = getPhonePrefix(countryCode);
                    if (val.startsWith(prefix)) {
                      setPhone(val);
                      if (val.length > prefix.length) setPhoneError(validatePhoneMessage(countryCode, val) || "");
                      else setPhoneError("");
                    } else {
                      setPhone(prefix);
                    }
                  } else {
                    setPhone(val);
                  }
                }}
                className={`input-field ${phoneError ? "error" : ""}`}
                placeholder={countryCode ? `${getPhonePrefix(countryCode)} XX XX XX XX` : "+229XXXXXXXX"}
              />
              {phoneError && <p className="text-neg text-xs mt-1">{phoneError}</p>}
            </div>
          </div>
          <div>
            <label className="field-label">Devise d&apos;affichage</label>
            <div className="flex items-center gap-1 p-1 bg-surface-raised border border-border rounded-xl w-fit">
              <button
                type="button"
                onClick={() => { setCurrency("XOF"); setActiveCurrency("XOF" as CurrencyCode); setDashboardCurrency("XOF" as CurrencyCode); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${currency === "XOF" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"}`}
              >
                FCFA
              </button>
              <button
                type="button"
                onClick={() => { setCurrency("EUR"); setActiveCurrency("EUR" as CurrencyCode); setDashboardCurrency("EUR" as CurrencyCode); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${currency === "EUR" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"}`}
              >
                EUR
              </button>
            </div>
            <p className="text-xs text-muted mt-1">Choisissez la devise d&apos;affichage.</p>
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
            {saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}

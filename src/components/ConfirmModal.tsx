"use client";

import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useScrollLock } from "@/hooks/useScrollLock";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  requirePassword?: boolean;
  passwordLabel?: string;
  onConfirm: (password?: string) => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  requirePassword = false,
  passwordLabel = "Confirmez avec votre mot de passe",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
 const [password, setPassword] = useState("");
 useScrollLock(open);
 if (!open) return null;

 const variantStyles = {
 danger: {
 icon: "bg-red-100",
 iconColor: "text-red-600",
 button: "bg-red-500 hover:bg-red-600",
 },
 warning: {
 icon: "bg-ochre-light",
 iconColor: "text-ochre",
 button: "bg-ochre hover:bg-ochre",
 },
 info: {
 icon: "bg-ochre-light",
 iconColor: "text-forest",
 button: "bg-forest hover:bg-forest",
 },
 };

 const v = variantStyles[variant];

 return (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 animate-fade-in">
  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
  <div className="flex flex-col items-center text-center mb-5">
  <div className={`w-14 h-14 rounded-full ${v.icon} flex items-center justify-center mb-4`}>
  <FontAwesomeIcon icon={faTriangleExclamation} className={`w-7 h-7 ${v.iconColor}`} />
  </div>
  <h3 className="text-lg font-semibold text-ink">{title}</h3>
  <p className="text-sm text-muted mt-2 leading-relaxed">{message}</p>
  </div>
  {requirePassword && (
    <div className="mb-5">
      <label className="block text-xs font-medium text-muted mb-1.5">{passwordLabel}</label>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Mot de passe"
        className="input-field w-full"
        autoFocus
      />
    </div>
  )}
  <div className="flex gap-3">
  <button
  type="button"
  onClick={onCancel}
  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-border text-muted hover:bg-sand transition-all"
  >
  {cancelLabel}
  </button>
  <button
  type="button"
  onClick={() => onConfirm(requirePassword ? password : undefined)}
  disabled={requirePassword && !password}
  className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm transition-all disabled:opacity-50 ${v.button}`}
  >
  {confirmLabel}
  </button>
  </div>
  </div>
 </div>
 );
}

"use client";

import { AlertTriangle } from "lucide-react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: "bg-red-100",
      iconColor: "text-red-600",
      button: "bg-red-500 hover:bg-red-600",
    },
    warning: {
      icon: "bg-amber-100",
      iconColor: "text-amber-600",
      button: "bg-amber-500 hover:bg-amber-600",
    },
    info: {
      icon: "bg-emerald-100",
      iconColor: "text-emerald-600",
      button: "bg-emerald-500 hover:bg-emerald-600",
    },
  };

  const v = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scale-in">
        <div className="flex flex-col items-center text-center mb-5">
          <div className={`w-14 h-14 rounded-full ${v.icon} flex items-center justify-center mb-4`}>
            <AlertTriangle className={`w-7 h-7 ${v.iconColor}`} />
          </div>
          <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
          <p className="text-sm text-stone-500 mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm transition-all ${v.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

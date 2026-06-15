"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

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
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
 <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scale-in">
 <div className="flex flex-col items-center text-center mb-5">
 <div className={`w-14 h-14 rounded-full ${v.icon} flex items-center justify-center mb-4`}>
 <FontAwesomeIcon icon={faTriangleExclamation} className={`w-7 h-7 ${v.iconColor}`} />
 </div>
 <h3 className="text-lg font-semibold text-ink">{title}</h3>
 <p className="text-sm text-muted mt-2 leading-relaxed">{message}</p>
 </div>
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

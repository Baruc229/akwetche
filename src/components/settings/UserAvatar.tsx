"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "md" | "lg";
  loading?: boolean;
}

export default function UserAvatar({ name, avatarUrl, size = "md", loading = false }: UserAvatarProps) {
  const initials = (() => {
    const n = name || "";
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  })();

  const sizeClasses = size === "lg" ? "w-20 h-20" : "w-16 h-16 sm:w-20 sm:h-20";
  const textSize = size === "lg" ? "text-2xl" : "text-xl sm:text-2xl";

  return (
    <div className="relative">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name || ""} className={`${sizeClasses} rounded-full object-cover shrink-0`} style={{ border: "3px solid var(--color-gold)" }} />
      ) : (
        <div className={`${sizeClasses} rounded-full flex items-center justify-center shrink-0`} style={{ background: "var(--color-brand)", border: "3px solid var(--color-gold)" }}>
          <span className={`${textSize} font-bold`} style={{ color: "var(--color-gold)" }}>{initials}</span>
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <FontAwesomeIcon icon={faSpinner} className="w-6 h-6 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}

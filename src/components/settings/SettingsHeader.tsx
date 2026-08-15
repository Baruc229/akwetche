"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default function SettingsHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-colors hover:text-[var(--color-brand)]"
        style={{ color: "var(--color-muted)" }}
      >
        <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
        Paramètres
      </Link>
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="text-muted text-sm mt-0.5">{subtitle}</p>}
    </div>
  );
}

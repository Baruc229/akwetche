"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobeAmericas, faShield, faLock, faCircleCheck, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

export default function AboutPage() {
  useEffect(() => { document.title = "À propos — Akwetche"; }, []);

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">À propos</h1>
        <p className="text-muted text-sm mt-0.5">Informations sur l&apos;application</p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-brand)", color: "white" }}>
            <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>A</span>
          </div>
          <div>
            <p className="text-base font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>Akwetche</p>
            <p className="text-xs text-muted">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-sm text-muted">Gestion de finances personnelle et commerciale. Simple, clair, efficace.</p>
        <div className="space-y-1">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
            <FontAwesomeIcon icon={faGlobeAmericas} className="w-4 h-4 text-muted" />
            Site officiel
            <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3 text-muted ml-auto" />
          </a>
          <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
            <FontAwesomeIcon icon={faShield} className="w-4 h-4 text-muted" />
            Mentions légales
            <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3 text-muted ml-auto" />
          </a>
          <a href="/cgu" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
            <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-muted" />
            Conditions générales d&apos;utilisation
            <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3 text-muted ml-auto" />
          </a>
          <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
            <FontAwesomeIcon icon={faShield} className="w-4 h-4 text-muted" />
            Politique de confidentialité
            <FontAwesomeIcon icon={faUpRightFromSquare} className="w-3 h-3 text-muted ml-auto" />
          </a>
          <a href="mailto:support@akwetche.com" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-ink hover:bg-[var(--color-brand-subtle)] transition-colors">
            <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4 text-muted" />
            Contacter le support
          </a>
        </div>
      </div>
    </div>
  );
}

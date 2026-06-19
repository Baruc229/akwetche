"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotFound() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) setIsLoggedIn(true);
        else setIsLoggedIn(false);
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  const href = isLoggedIn === true ? "/dashboard" : "/";

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-forest/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-forest mb-2">404</h1>
        <p className="text-stone text-lg mb-8">Page introuvable</p>
        <Link
          href={href}
          className="inline-flex items-center justify-center bg-forest text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-forest-dark transition-colors"
        >
          {isLoggedIn === true ? "Retour au tableau de bord" : "Retour à l'accueil"}
        </Link>
      </div>
    </div>
  );
}

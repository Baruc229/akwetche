"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTag } from "@fortawesome/free-solid-svg-icons";

export default function CategoriesSettingsPage() {
  useEffect(() => { document.title = "Catégories — Akwetche"; }, []);

  return (
    <>
      <p className="text-label mb-3">Catégories</p>
      <div className="card">
        <p className="text-sm text-muted mb-3">Gérez vos catégories de revenus et dépenses depuis la page dédiée.</p>
        <Link href="/dashboard/categories" className="btn-primary w-full justify-center flex items-center gap-2 text-sm">
          <FontAwesomeIcon icon={faTag} className="w-4 h-4" />
          Gérer les catégories →
        </Link>
      </div>
    </>
  );
}

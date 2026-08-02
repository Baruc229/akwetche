"use client";

import { useEffect, useRef } from "react";

/**
 * Lie l'ouverture d'une modale à l'historique du navigateur.
 *
 * - Le retour téléphone/browser ferme la modale au lieu de quitter la page.
 * - Une deuxième pression quitte la page.
 * - La fermeture normale (croix / fond) retire l'entrée d'historique ajoutée.
 */
export function useModalBack(anyModalOpen: boolean, closeAllModals: () => void) {
  const modalBackActive = useRef(false);
  const closeAllRef = useRef(closeAllModals);

  useEffect(() => {
    closeAllRef.current = closeAllModals;
  }, [closeAllModals]);

  useEffect(() => {
    if (anyModalOpen) {
      if (!modalBackActive.current) {
        window.history.pushState({ modalBack: true }, "", window.location.href);
        modalBackActive.current = true;
      }
      const onPopState = () => {
        if (anyModalOpen) {
          closeAllRef.current();
          window.history.pushState({ modalBack: true }, "", window.location.href);
        }
      };
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    } else {
      if (modalBackActive.current) {
        modalBackActive.current = false;
        window.history.back();
      }
    }
  }, [anyModalOpen]);
}

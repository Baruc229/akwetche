"use client";

import { useEffect } from "react";

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    const body = document.body;

    if (locked) {
      const scrollY = window.scrollY;
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.width = "100%";

      return () => {
        body.style.removeProperty("overflow");
        body.style.removeProperty("position");
        body.style.removeProperty("top");
        body.style.removeProperty("width");
        window.scrollTo(0, scrollY);
      };
    } else {
      body.style.removeProperty("overflow");
      body.style.removeProperty("position");
      body.style.removeProperty("top");
      body.style.removeProperty("width");
    }
  }, [locked]);
}

"use client";

import { useEffect } from "react";

let lockCount = 0;
let savedScrollY = 0;

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (locked) {
      if (lockCount === 0) {
        savedScrollY = window.scrollY;
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.width = "100%";
      }
      lockCount++;

      return () => {
        lockCount--;
        if (lockCount === 0) {
          document.body.style.removeProperty("overflow");
          document.body.style.removeProperty("position");
          document.body.style.removeProperty("top");
          document.body.style.removeProperty("width");
          window.scrollTo(0, savedScrollY);
        }
      };
    }
  }, [locked]);
}

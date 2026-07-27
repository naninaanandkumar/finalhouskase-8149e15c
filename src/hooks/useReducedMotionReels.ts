import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "reels:autoplay-disabled";

function readSystemPref(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readUserPref(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

/**
 * Returns { autoplayDisabled, toggle, isUserSet }.
 * autoplayDisabled = true means videos should NOT autoplay (show poster + play button).
 * Respects user toggle first, then OS prefers-reduced-motion.
 */
export function useReducedMotionReels() {
  const [systemPref, setSystemPref] = useState<boolean>(() => readSystemPref());
  const [userPref, setUserPref] = useState<boolean | null>(() => readUserPref());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const autoplayDisabled = userPref !== null ? userPref : systemPref;

  const toggle = useCallback(() => {
    setUserPref((prev) => {
      const next = !(prev !== null ? prev : systemPref);
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, [systemPref]);

  return { autoplayDisabled, toggle, isUserSet: userPref !== null };
}

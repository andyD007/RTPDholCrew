"use client";

import { useEffect, useRef, useState } from "react";

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Loads the hero reel only when it makes sense: not on reduced motion, not on
 * Save-Data / slow connections. The poster image underneath stays the LCP.
 */
export function HeroVideo({ src }: { src: string }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const slow = conn?.saveData || (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType));
    if (reduce || slow) return;
    // Defer until the page is idle so the video never competes with first paint.
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setEnabled(true)) : window.setTimeout(() => setEnabled(true), 1200);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
  }, []);

  if (!enabled) return null;
  return (
    <video
      ref={ref}
      className={`absolute inset-0 -z-20 size-full object-cover transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      onCanPlay={() => setReady(true)}
    />
  );
}

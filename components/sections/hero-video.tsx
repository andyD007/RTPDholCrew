"use client";

import { useEffect, useRef, useState } from "react";

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Loads the hero reel only when it makes sense: not on reduced motion, not on
 * Save-Data / slow connections. The poster image underneath stays the LCP.
 */
/**
 * Portrait screens show the vertical reel full-bleed; landscape screens get a
 * softly blurred, slightly zoomed version as ambient motion (a 9:16 phone clip
 * cropped to 16:9 would otherwise look soft).
 */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
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
      className={`absolute inset-0 -z-20 size-full object-cover transition-opacity duration-1000 landscape:scale-110 landscape:blur-md ${ready ? "opacity-100" : "opacity-0"}`}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      onCanPlay={() => setReady(true)}
    >
      {/* MP4 (H.264) plays almost everywhere; the local reel also ships a WebM fallback. */}
      <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
      {src.startsWith("/") && src.endsWith(".mp4") ? <source src={src.replace(/\.mp4$/, ".webm")} type="video/webm" /> : null}
    </video>
  );
}

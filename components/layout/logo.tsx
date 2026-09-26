import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark: a gold beat-mark + condensed caps. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 rounded-md", className)} aria-label="RTP Dhol Crew — home">
      <BeatMark className="size-8 text-gold transition-transform duration-300 group-hover:scale-105" />
      <span className="font-display text-[1.35rem] leading-none tracking-[0.04em]">
        RTP <span className="text-gold">Dhol</span> Crew
      </span>
    </Link>
  );
}

/** Abstract mark: a drum-head ring struck by two sticks. */
export function BeatMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <circle cx="16" cy="18" r="10" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="16" cy="18" r="4" fill="currentColor" />
      <path d="M5 3l7.5 9.5M27 3l-7.5 9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

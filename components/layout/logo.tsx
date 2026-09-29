import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import crest from "@/public/brand/crest.png";

/** Header/footer lockup: the RTP Dhol Crew crest + condensed caps wordmark. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 rounded-md", className)} aria-label="RTP Dhol Crew — home">
      <CrestMark className="h-10 w-auto transition-transform duration-300 group-hover:scale-105 lg:h-11" priority />
      <span className="font-display text-[1.35rem] leading-none tracking-[0.04em]">
        RTP <span className="text-gold">Dhol</span> Crew
      </span>
    </Link>
  );
}

/** The crest from the RTP Dhol Crew badge (gold on transparent). */
export function CrestMark({ className, priority = false }: { className?: string; priority?: boolean }) {
  return <Image src={crest} alt="" aria-hidden sizes="96px" quality={80} preload={priority} className={className} />;
}

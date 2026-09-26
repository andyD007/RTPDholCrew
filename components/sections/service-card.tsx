import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import type { ServiceView } from "@/types/content";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export function ServiceCard({ service, className, priority }: { service: ServiceView; className?: string; priority?: boolean }) {
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-border-strong", className)}>
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[4/4.2]">
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={`${service.name} — live dhol by RTP Dhol Crew`}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 90vw"
            quality={70}
            loading={priority ? "eager" : "lazy"}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : null}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          {service.isComingSoon ? <Badge tone="gold">Coming soon</Badge> : null}
          {service.performers > 1 ? (
            <Badge tone="neutral" className="bg-black/50 backdrop-blur">
              <Users className="size-3" /> {service.performers} players
            </Badge>
          ) : null}
        </div>
        <h3 className="absolute inset-x-5 bottom-4 font-display text-4xl leading-none">{service.name}</h3>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 pt-3">
        <p className="text-sm leading-relaxed text-foreground/80">{service.shortDescription}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-[0.14em] text-subtle">Typical use · </span>
          {service.typicalUse}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <Link
            href={`/services/${service.slug}`}
            className="text-sm font-semibold text-foreground/80 underline-offset-4 after:absolute after:inset-0 hover:text-foreground hover:underline"
          >
            Details<span className="sr-only"> about {service.name}</span>
          </Link>
          {service.isBookable && !service.isComingSoon ? (
            <Link
              href={`/check-availability?source=service&service=${service.slug}`}
              className="relative z-10 inline-flex items-center gap-1 rounded-full bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:bg-gold-soft"
            >
              Check date <ArrowUpRight className="size-3.5" />
            </Link>
          ) : (
            <Link
              href="/contact?topic=future-services"
              className="relative z-10 inline-flex items-center gap-1 rounded-full border border-border-strong px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80 transition hover:border-gold hover:text-gold"
            >
              Get notified
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

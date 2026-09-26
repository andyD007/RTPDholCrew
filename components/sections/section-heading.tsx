import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-6 md:mb-14",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-3xl", align === "center" && "mx-auto")}>
        {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
        <Heading className="font-display text-5xl sm:text-6xl lg:text-7xl">{title}</Heading>
        {description ? <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Page-top hero for interior pages. */
export function PageHero({ eyebrow, title, description, children }: { eyebrow: string; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border pb-14 pt-32 sm:pb-20 sm:pt-40">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-gold/10 blur-[120px]" />
      <div className="container-page relative">
        <p className="eyebrow mb-5">{eyebrow}</p>
        <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl">{title}</h1>
        {description ? <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p> : null}
        {children}
      </div>
    </section>
  );
}

import { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowDown, Play } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { HeroVideo } from "./hero-video";

export function Hero() {
  return (
    <section className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 sm:pb-24" aria-labelledby="hero-title">
      {/* Poster first (LCP) via art direction; video progressively enhances on capable devices. */}
      <HeroPoster />
      {siteConfig.heroVideoUrl ? <HeroVideo src={siteConfig.heroVideoUrl} /> : null}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/55 to-background/30" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      <div className="container-page">
        <p className="eyebrow mb-6 animate-fade-up">{siteConfig.name}</p>
        <h1 id="hero-title" className="font-display text-[clamp(3.4rem,14vw,11rem)] leading-[0.95] sm:leading-[0.88]">
          <span className="block animate-fade-up [animation-delay:80ms]">Bring the beat.</span>
          <span className="block animate-fade-up text-gold [animation-delay:180ms]">Own the moment.</span>
        </h1>
        <p className="mt-7 max-w-xl animate-fade-up text-base leading-relaxed text-foreground/80 [animation-delay:280ms] sm:text-lg">
          High-energy live Dhol entertainment for weddings, Baraats, receptions, birthdays and celebrations across the
          Triangle.
        </p>
        <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:380ms] sm:flex-row">
          <Button asChild size="xl">
            <Link href="/check-availability?source=hero">Check availability</Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="backdrop-blur-sm">
            <Link href="/#the-feed">
              <Play className="fill-current" /> Watch us perform
            </Link>
          </Button>
        </div>
        <div className="mt-14 flex items-center justify-between gap-6 border-t border-white/10 pt-6 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-foreground/60">
          <p>{siteConfig.serviceAreaLabel}</p>
          <a href="#the-feed" className="hidden items-center gap-2 transition hover:text-foreground sm:flex">
            Scroll <ArrowDown className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function HeroPoster() {
  const common = { alt: "", sizes: "100vw", fetchPriority: "high" as const };
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, width: 1280, height: 720, quality: 70, src: "/media/samples/hero-poster.jpg" });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, width: 576, height: 1024, quality: 75, src: "/media/samples/hero-poster-mobile.jpg" });
  return (
    <picture>
      <source media="(min-width: 640px)" srcSet={desktop} />
      <source srcSet={mobile} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt="" is provided via getImageProps */}
      <img {...rest} className="absolute inset-0 -z-20 size-full object-cover" />
    </picture>
  );
}

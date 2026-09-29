import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ShowcaseView } from "@/types/content";
import { ShowcaseGrid } from "@/components/media/showcase-grid";
import { CrestMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

/** Instagram-profile-style header + grid. */
export function FeedSection({ showcases, instagram, limit = 9 }: { showcases: ShowcaseView[]; instagram: string; limit?: number }) {
  const handle = instagram ? `@${instagram.replace(/\/$/, "").split("/").pop()}` : "@rtpdholcrew";
  const mediaCount = showcases.reduce((n, s) => n + s.media.length, 0);
  const cities = new Set(showcases.map((s) => s.city).filter(Boolean)).size;
  return (
    <section id="the-feed" className="scroll-mt-20 py-20 sm:py-28" aria-labelledby="feed-title">
      <div className="container-page">
        <div className="mx-auto max-w-[1080px]">
        <div className="mb-8 flex flex-col gap-6 sm:mb-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="rounded-full bg-gradient-to-tr from-gold via-gold-soft to-burgundy p-[2px]">
              <div className="grid size-16 place-items-center rounded-full bg-background sm:size-20">
                <CrestMark className="h-11 w-auto sm:h-14" />
              </div>
            </div>
            <div>
              <h2 id="feed-title" className="font-display text-4xl sm:text-5xl">The Feed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{handle}</span> · Real events across the Triangle
              </p>
              <dl className="mt-3 flex gap-5 text-sm">
                <div className="flex gap-1.5"><dt className="sr-only">Events</dt><dd><span className="font-semibold">{showcases.length}</span> <span className="text-muted-foreground">events</span></dd></div>
                <div className="flex gap-1.5"><dt className="sr-only">Posts</dt><dd><span className="font-semibold">{mediaCount}</span> <span className="text-muted-foreground">posts</span></dd></div>
                <div className="flex gap-1.5"><dt className="sr-only">Cities</dt><dd><span className="font-semibold">{cities}</span> <span className="text-muted-foreground">cities</span></dd></div>
              </dl>
            </div>
          </div>
          <div className="flex gap-2">
            {instagram ? (
              <Button asChild variant="outline" size="md">
                <a href={instagram} target="_blank" rel="noreferrer">
                  Follow on Instagram <ArrowUpRight />
                </a>
              </Button>
            ) : null}
            <Button asChild variant="secondary" size="md">
              <Link href="/events">All events</Link>
            </Button>
          </div>
        </div>
        <ShowcaseGrid showcases={showcases} limit={limit} />
        </div>
      </div>
    </section>
  );
}

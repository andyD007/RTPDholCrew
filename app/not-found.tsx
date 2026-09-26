import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-20">
      <div className="text-center">
        <Logo />
        <p className="mt-16 font-display text-[8rem] leading-none text-gold sm:text-[12rem]">404</p>
        <h1 className="mt-4 font-display text-4xl">Lost the beat</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">That page doesn&apos;t exist, or the link has expired.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">Back home</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/check-availability">Check availability</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { anton, inter } from "./fonts";
import { siteConfig } from "@/lib/config";
import { Analytics } from "@/components/layout/analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "RTP Dhol Crew | Live Dhol Players in Raleigh, Durham & Cary, NC",
    template: "%s | RTP Dhol Crew",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_US",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "RTP Dhol Crew — live dhol entertainment" }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${anton.variable} dark`} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!bg-card !border !border-border !text-foreground !rounded-xl",
              description: "!text-muted-foreground",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}

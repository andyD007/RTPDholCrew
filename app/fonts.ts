import localFont from "next/font/local";

/**
 * Fonts are self-hosted (copied from @fontsource packages) so builds never
 * depend on reaching Google Fonts and nothing is requested from third parties.
 */
export const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const anton = localFont({
  src: "./fonts/Anton-Regular.woff2",
  variable: "--font-anton",
  weight: "400",
  display: "swap",
  preload: true,
});

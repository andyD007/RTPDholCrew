import { expect, it } from "vitest";
import { normalizeSiteUrl } from "@/lib/site-url";
it("site url", () => {
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "rtpdholcrew.com";
  expect(normalizeSiteUrl("")).toBe("https://rtpdholcrew.com");
  expect(normalizeSiteUrl(" rtpdholcrew.com/ ")).toBe("https://rtpdholcrew.com");
  expect(normalizeSiteUrl("https://x.com/a")).toBe("https://x.com");
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  expect(normalizeSiteUrl(undefined)).toBe("http://localhost:3000");
});

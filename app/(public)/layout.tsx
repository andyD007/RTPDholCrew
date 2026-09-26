import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileBookingBar } from "@/components/layout/mobile-booking-bar";
import { JsonLd } from "@/components/layout/json-ld";
import { getPublicSettings } from "@/lib/database/public-content";
import { localBusinessJsonLd } from "@/lib/seo/structured-data";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const { profile, social } = await getPublicSettings();
  return (
    <>
      <JsonLd data={localBusinessJsonLd(profile, social)} />
      <SiteHeader phone={profile.phone} instagram={social.instagram} />
      <main id="main">{children}</main>
      <SiteFooter profile={profile} social={social} />
      <MobileBookingBar />
    </>
  );
}

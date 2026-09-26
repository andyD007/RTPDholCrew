import Script from "next/script";
import { siteConfig } from "@/lib/config";

/** GA4 + Meta Pixel, only rendered when their IDs are configured. */
export function Analytics() {
  const { gaId, metaPixelId } = siteConfig.analytics;
  const safeGa = /^G-[A-Z0-9]+$/.test(gaId) ? gaId : "";
  const safePixel = /^\d+$/.test(metaPixelId) ? metaPixelId : "";
  return (
    <>
      {safeGa ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${safeGa}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${safeGa}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
      {safePixel ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${safePixel}');fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}

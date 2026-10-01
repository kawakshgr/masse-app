import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ServiceWorker } from "@/components/ServiceWorker";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Display and numerals.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
});

// UI and body.
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Functions run in Frankfurt, beside the database. This is not a latency
// preference: the database holds GDPR Article 9 data, and compute that touches
// it should not sit in another jurisdiction. Pinned here rather than in a
// dashboard setting so it survives a project being recreated.
export const preferredRegion = "fra1";

export const metadata: Metadata = {
  title: "Masse",
  description: "Le logiciel des coachs de force.",
  applicationName: "Masse",
  appleWebApp: { capable: true, title: "Masse", statusBarStyle: "black" },
  icons: { icon: "/icon-192.png?v=2", apple: "/apple-icon.png?v=2" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#161616" },
    { media: "(prefers-color-scheme: light)", color: "#e7f2f3" },
  ],
  // Her thumb is on the screen mid-set; a stray double-tap must not zoom.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      data-theme="dark"
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrument.variable} h-full`}
    >
      <body className="min-h-full">
        {/* Resolves the stored choice before anything paints, so switching to
            light does not flash the dark palette first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=localStorage.getItem("masse:theme");var r=(c==="light"||c==="dark")?c:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=r;}catch(e){}})();`,
          }}
        />
        {/* iOS 26, installed app (WebKit bug 301108): with the translucent
            status bar the layout viewport comes out short by the top inset,
            and nothing is painted in that band at the bottom of the screen.
            Since 1 Oct 2026 the status bar is opaque ("black"), which gives
            the whole height back; this only still serves an app installed
            before, until it is reinstalled — no top inset, nothing to do.
            --app-h is the screen's height, --app-gap the band: what sits on
            the bottom edge lands just above it, and the home indicator's
            inset is already behind it.
            Both are 0-cost elsewhere (the CSS falls back to 100dvh / 0). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;function f(){try{if(!(navigator.standalone||matchMedia("(display-mode: standalone)").matches))return;var p=matchMedia("(orientation: portrait)").matches;var w=p?Math.min(screen.width,screen.height):Math.max(screen.width,screen.height);var h=p?Math.max(screen.width,screen.height):Math.min(screen.width,screen.height);if(w>=768||Math.abs(w-innerWidth)>2)return;var e=document.createElement("div");e.style.cssText="position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top);visibility:hidden";d.appendChild(e);var t=e.offsetHeight;d.removeChild(e);if(t<1){d.style.removeProperty("--app-h");d.style.removeProperty("--app-gap");return}var g=h-innerHeight;if(g<0||g>100)return;d.style.setProperty("--app-h",h+"px");d.style.setProperty("--app-gap",g+"px");}catch(e){}}f();addEventListener("orientationchange",function(){setTimeout(f,300)});addEventListener("pageshow",f);})();`,
          }}
        />
        {/* Chrome offers installation once, early — often before React has
            mounted anything to listen. Kept here until the prompt asks. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__masseInstall=e;window.dispatchEvent(new Event("masse:installable"));});`,
          }}
        />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}

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
  appleWebApp: { capable: true, title: "Masse", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05121b" },
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
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}

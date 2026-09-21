import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
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
      className={`${bricolage.variable} ${instrument.variable} h-full`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

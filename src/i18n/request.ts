import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

export default getRequestConfig(async ({ locale: asked }) => {
  // A caller may ask for one language outright — the invoice is always
  // French (lib/invoice.ts) — otherwise the app's language, from the cookie.
  const store = await cookies();
  const candidate = asked ?? store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(candidate) ? candidate : defaultLocale;

  return {
    locale,
    // The coaches and their clients are in France; server and browser must
    // agree on which day it is, or a date rendered at 23:30 hydrates wrong.
    timeZone: "Europe/Paris",
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

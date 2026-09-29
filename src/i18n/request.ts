import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const candidate = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(candidate) ? candidate : defaultLocale;

  return {
    locale,
    // The coaches and their clients are in France; server and browser must
    // agree on which day it is, or a date rendered at 23:30 hydrates wrong.
    timeZone: "Europe/Paris",
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

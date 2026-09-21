// French first — the first coaches are French-speaking. English second.
export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";
export const LOCALE_COOKIE = "MASSE_LOCALE";

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

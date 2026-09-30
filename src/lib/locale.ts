/**
 * The app's language ("fr" / "en") as the locale dates and numbers are
 * written in. English is British: day before month, 24-hour clock — what a
 * European client expects. Invoices stay French whatever this says: they
 * are a French coach's legal documents.
 */
export function intl(locale: string): "fr-FR" | "en-GB" {
  return locale.startsWith("en") ? "en-GB" : "fr-FR";
}

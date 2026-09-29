/**
 * WhatsApp is where coaches and clients talk (decided 26 Sep 2026), so every
 * nudge Masse offers is a wa.me link with the message already written. Plain
 * module: server and client components both build these links.
 */

/** "06 12 34 56 78" → "33612345678", the form wa.me wants. French by default. */
export function waNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("0")) digits = `33${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

/** The link that opens her conversation with the text typed in, or null
 *  when her file has no usable number. */
export function waLink(raw: string | null | undefined, text: string): string | null {
  const number = waNumber(raw);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

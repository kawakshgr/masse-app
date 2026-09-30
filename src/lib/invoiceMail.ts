/**
 * Sending is optional and off until it is configured. Masse will not pretend to
 * have sent anything: with no provider key the button never appears, and the
 * coach downloads the PDF and attaches it herself.
 *
 * The provider is Brevo (French, data in the EU), through its transactional
 * API. The same account relays Supabase's sign-in emails over SMTP.
 */
export function mailerConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.INVOICE_FROM_EMAIL);
}

export type MailResult = { ok: true } | { ok: false; reason: string };

/** "Masse <factures@masseapp.online>" → Brevo's { name, email }. */
function sender(raw: string): { name?: string; email: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || undefined, email: match[2] } : { email: raw.trim() };
}

/** Why the provider said no, as far as its answer tells. */
export const MAIL_FAILURES = ["ip", "cle", "cle-smtp", "cle-forme", "expediteur", "compte", "autre"] as const;
export type MailFailure = (typeof MAIL_FAILURES)[number];

/**
 * Brevo's refusal, sorted into the few causes someone can act on. Its own
 * words stay in the server log; the screen names the cause.
 */
export function mailFailure(reason: string): MailFailure {
  if (reason === "smtp-key") return "cle-smtp";
  if (reason === "malformed-key") return "cle-forme";
  if (/unrecogni[sz]ed IP|authori[sz]ed_ips/i.test(reason)) return "ip";
  if (/not yet activated|permission_denied/i.test(reason)) return "compte";
  if (/sender/i.test(reason)) return "expediteur";
  if (/key not found|api[- ]?key|unauthorized|not-configured/i.test(reason)) return "cle";
  return "autre";
}

export async function sendInvoiceMail({
  to,
  replyTo,
  subject,
  body,
  fileName,
  pdf,
}: {
  to: string;
  /** The coach. Her clients reply to her, not to the app. */
  replyTo: string | null;
  subject: string;
  body: string;
  fileName: string;
  pdf: Buffer;
}): Promise<MailResult> {
  if (!mailerConfigured()) return { ok: false, reason: "not-configured" };

  // Brevo hands out two kinds of key and only one opens its API. Their
  // prefixes are public markers, so the mix-up can be named without a call —
  // and without ever writing the key itself anywhere.
  const key = process.env.BREVO_API_KEY!.trim();
  if (key.startsWith("xsmtpsib-")) return { ok: false, reason: "smtp-key" };
  if (!/^xkeysib-[A-Za-z0-9-]{60,}$/.test(key)) {
    console.error("[invoice mail] BREVO_API_KEY has an unexpected shape", {
      length: key.length,
      startsWithApiPrefix: key.startsWith("xkeysib-"),
    });
    return { ok: false, reason: "malformed-key" };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": key,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: sender(process.env.INVOICE_FROM_EMAIL!),
      replyTo: replyTo ? { email: replyTo } : undefined,
      to: [{ email: to }],
      subject,
      textContent: body,
      attachment: [{ name: fileName, content: pdf.toString("base64") }],
    }),
  });

  if (!response.ok) {
    // The provider's own words, trimmed — a coach can act on "sender not
    // valid" and cannot act on "400".
    const detail = await response.text();
    return { ok: false, reason: detail.slice(0, 200) || String(response.status) };
  }
  return { ok: true };
}

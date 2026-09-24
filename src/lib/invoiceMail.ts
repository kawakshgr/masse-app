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

/** "Masse <factures@masseapp.fr>" → Brevo's { name, email }. */
function sender(raw: string): { name?: string; email: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || undefined, email: match[2] } : { email: raw.trim() };
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

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
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

/**
 * Sending is optional and off until it is configured. Masse will not pretend to
 * have sent anything: with no provider key the button never appears, and the
 * coach downloads the PDF and attaches it herself.
 */
export function mailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.INVOICE_FROM_EMAIL);
}

export type MailResult = { ok: true } | { ok: false; reason: string };

export async function sendInvoiceMail({
  to,
  subject,
  body,
  fileName,
  pdf,
}: {
  to: string;
  subject: string;
  body: string;
  fileName: string;
  pdf: Buffer;
}): Promise<MailResult> {
  if (!mailerConfigured()) return { ok: false, reason: "not-configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.INVOICE_FROM_EMAIL,
      // Her clients reply to her, not to the app.
      reply_to: process.env.INVOICE_REPLY_TO || undefined,
      to: [to],
      subject,
      text: body,
      attachments: [{ filename: fileName, content: pdf.toString("base64") }],
    }),
  });

  if (!response.ok) {
    // The provider's own words, trimmed — a coach can act on "domain not
    // verified" and cannot act on "500".
    const detail = await response.text();
    return { ok: false, reason: detail.slice(0, 200) || String(response.status) };
  }
  return { ok: true };
}

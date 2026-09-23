import { createClient } from "@/lib/supabase/server";
import { invoiceFileName, invoiceLabels, loadInvoice } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/invoicePdf";

/** Fonts are read off disk, so this cannot run on the edge runtime. */
export const runtime = "nodejs";

/**
 * The invoice as a file. `?telecharger=1` makes the browser save it instead of
 * showing it; without it, the PDF viewer opens inline.
 *
 * RLS does the authorising: the loader's queries return nothing for a client
 * who is not this coach's, and the route answers 404 the same way it would for
 * one that does not exist.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string; period: string }> },
) {
  const { clientId, period } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const data = await loadInvoice(supabase, clientId, period);

  if (data === "not-found") return new Response("Not found", { status: 404 });
  if (data === "no-company") {
    return new Response("No billing profile", { status: 409 });
  }

  const pdf = await renderInvoicePdf(data, await invoiceLabels());
  const download = new URL(request.url).searchParams.get("telecharger") === "1";
  const name = invoiceFileName(data, period);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      // An invoice is one coach's document; no shared cache may hold it.
      "cache-control": "private, no-store",
    },
  });
}

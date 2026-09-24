import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Opens one invoice's PDF. A fresh signed link on every tap, rather than one
 * baked into the page: a link that outlives the screen is a link that can be
 * forwarded. RLS decides whether the row — and so the file — is hers.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const back = new URL("/reglages/facturation?pdf=echec", request.url);

  const { data: invoice } = await supabase
    .from("invoices")
    .select("pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (!invoice?.pdf_path) return NextResponse.redirect(back);

  const { data } = await supabase.storage.from("invoices").createSignedUrl(invoice.pdf_path, 300);
  if (!data?.signedUrl) return NextResponse.redirect(back);

  return NextResponse.redirect(data.signedUrl);
}

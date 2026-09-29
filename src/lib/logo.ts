/**
 * Where a coach's logo is served from. The bucket is public — a logo is
 * branding — so the URL needs no signing. Plain module: server pages, client
 * components and the PDF renderer all build it the same way.
 */
export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/coach-logos/${path}` : null;
}

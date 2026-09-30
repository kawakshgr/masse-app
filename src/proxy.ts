import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { OLD_HOST, SITE_URL } from "@/lib/site";

export async function proxy(request: NextRequest) {
  // The address before the domain existed: bookmarks and installed apps still
  // point at it, and a session there is not a session here. Everyone is sent
  // to the one address — except /api, which Vercel Cron calls on the
  // project's own host and which follows no redirect.
  const { hostname, pathname, search } = request.nextUrl;
  if (hostname === OLD_HOST && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(`${SITE_URL}${pathname}${search}`, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, images, and the PWA entry points.
    // The manifest and the worker must be fetchable without a session: gating
    // them redirects both to /connexion, which makes the app uninstallable and
    // stops the worker registering at all.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};

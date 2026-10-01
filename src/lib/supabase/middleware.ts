import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Onboarding runs before the client has an account.
// /api/retention and /api/notify check their own secret; the legal pages are for everyone.
const PUBLIC_PATHS = [
  "/connexion",
  "/auth",
  "/invitation",
  "/hors-ligne",
  "/api/retention",
  "/api/notify",
  "/confidentialite",
  "/mentions-legales",
  "/conditions",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() refreshes the session when it has expired and verifies the
  // JWT's signature here, against the project's ES256 key (JWKS cached) —
  // trustworthy enough to gate a page on, without a trip to the auth server
  // on every request as getUser() made (1 Oct 2026). getSession() alone
  // trusts the cookie and is not.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

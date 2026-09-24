import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Only same-site paths, so `suite` can never become an open redirect. */
function safeSuite(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const suite = safeSuite(searchParams.get("suite"));

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?erreur=callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/connexion?erreur=callback`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/connexion?erreur=callback`);
  }

  // Someone finishing onboarding has neither row yet, by design. Sending her to
  // /bienvenue would tell her she cannot be a coach — which is true, and
  // entirely beside the point. Let the invite flow finish first.
  if (suite?.startsWith("/invitation")) {
    return NextResponse.redirect(`${origin}${suite}`);
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (coach) {
    return NextResponse.redirect(`${origin}${suite ?? "/clients"}`);
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (client) {
    // Back where she was headed, when that was one of her own screens.
    const hers = ["/aujourdhui", "/seance", "/nutrition", "/cycle", "/coach", "/reglages"];
    const back = suite && hers.some((path) => suite.startsWith(path)) ? suite : "/aujourdhui";
    return NextResponse.redirect(`${origin}${back}`);
  }

  // Neither, and not mid-onboarding: she still has to introduce herself.
  return NextResponse.redirect(`${origin}/bienvenue`);
}

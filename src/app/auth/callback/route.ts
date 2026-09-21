import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const suite = searchParams.get("suite") ?? "/clients";

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?erreur=callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/connexion?erreur=callback`);
  }

  // A signed-in user without a coaches row has not introduced herself yet.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!coach) {
      return NextResponse.redirect(`${origin}/bienvenue`);
    }
  }

  return NextResponse.redirect(`${origin}${suite}`);
}

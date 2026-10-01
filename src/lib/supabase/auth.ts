import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = { id: string; email: string | null };

/**
 * The signed-in user, read once per request (1 Oct 2026). getClaims()
 * verifies the session's JWT here, against the project's ES256 signing key
 * (JWKS fetched once and cached), instead of asking the auth server on every
 * call as getUser() does — a page used to make three to five such trips. The
 * middleware has already refreshed the session. RLS still reads the same JWT.
 * Server actions that change data keep getUser().
 */
export const authUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims?.sub ? { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null } : null;
});

"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    // Passkeys are experimental in Supabase Auth: without this opt-in every
    // passkey call throws. See lib/passkeys.ts.
    { auth: { experimental: { passkey: true } } },
  );
}

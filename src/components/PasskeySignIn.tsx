"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { passkeyCancelled, passkeysHere } from "@/lib/passkeys";

const never = () => () => {};

/**
 * Back in with the passkey registered from settings: no e-mail to type, the
 * device finds the account. Shown only where a passkey can work.
 */
export function PasskeySignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const t = useTranslations("passkeys");
  const here = useSyncExternalStore(never, passkeysHere, () => false);
  const [state, setState] = useState<"idle" | "asking" | "failed" | "done">("idle");

  if (!here) return null;

  async function signIn() {
    setState("asking");
    const { data, error } = await createClient().auth.signInWithPasskey();
    if (error || !data?.session) {
      setState(error && passkeyCancelled(error) ? "idle" : "failed");
      return;
    }
    setState("done");
    onSignedIn();
  }

  return (
    <div className="mt-5 border-t border-[var(--hair)] pt-5">
      <button
        type="button"
        onClick={signIn}
        disabled={state === "asking" || state === "done"}
        className="h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] text-[15px] font-semibold text-[var(--ink)] disabled:opacity-50"
      >
        {state === "asking" ? t("asking") : t("signIn")}
      </button>
      <p className="mt-2 text-[12.5px] leading-[1.45] text-[var(--ink3)]">{t("signInHint")}</p>
      {state === "done" && (
        <p role="status" className="mt-2 text-[13px] text-[var(--accent-soft)]">
          {t("signedIn")}
        </p>
      )}
      {state === "failed" && (
        <p role="alert" className="mt-2 text-[13px] leading-[1.45] text-[var(--a3)]">
          {t("signInFailed")}
        </p>
      )}
    </div>
  );
}

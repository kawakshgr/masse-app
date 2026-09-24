"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * The code in the sign-in email, typed rather than tapped.
 *
 * A magic link only finishes in the browser that asked for it: PKCE keeps its
 * verifier there. On an iPhone the installed app and Safari do not share
 * storage, and a mail app opens links in Safari — so from the installed app
 * the link can never work. The code does, wherever the email was read.
 */
export function OtpCodeEntry({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => void;
}) {
  const t = useTranslations("auth");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "bad">("idle");

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setState("checking");
    const { error } = await createClient().auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setState("bad");
      return;
    }
    onVerified();
  }

  return (
    <form onSubmit={verify} className="mt-5 border-t border-[var(--hair)] pt-5">
      <label htmlFor="otp" className="block text-[12px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {t("codeLabel")}
      </label>
      <input
        id="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(event) => {
          setCode(event.target.value.replace(/\D/g, "").slice(0, 8));
          setState("idle");
        }}
        placeholder="••••••"
        className="tnum mt-2 h-12 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-center text-[20px] font-semibold tracking-[.4em] text-[var(--ink)] placeholder:text-[var(--ink3)]"
      />
      <p className="mt-2 text-[12.5px] leading-[1.45] text-[var(--ink3)]">{t("codeHint")}</p>
      {state === "bad" && (
        <p role="alert" className="mt-2 text-[13px] text-[var(--a3)]">
          {t("codeBad")}
        </p>
      )}
      <button
        type="submit"
        disabled={code.length < 6 || state === "checking"}
        className="mt-3 h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] text-[15px] font-semibold text-[var(--ink)] disabled:opacity-50"
      >
        {state === "checking" ? t("codeChecking") : t("codeVerify")}
      </button>
    </form>
  );
}

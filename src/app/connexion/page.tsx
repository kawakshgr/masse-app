"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "sending" | "sent" | "error";

function SignInForm() {
  const t = useTranslations("auth");
  const tApp = useTranslations("app");
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  const callbackFailed = params.get("erreur") === "callback";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");

    const supabase = createClient();
    const suite = params.get("suite") ?? "/clients";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?suite=${encodeURIComponent(suite)}`,
      },
    });

    setState(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass lift w-full max-w-[420px] rounded-r4 p-8">
        <p className="font-display text-[13px] font-semibold tracking-[-.02em] text-[var(--a1)]">
          {tApp("name")}
        </p>
        <h1 className="mt-2 font-display text-[28px] font-extrabold tracking-[-.04em]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink2)]">
          {t("lede")}
        </p>

        {callbackFailed && (
          <p
            role="alert"
            className="mt-4 rounded-r2 border border-[var(--a3)] px-3 py-2 text-[12px] text-[var(--a3)]"
          >
            {t("callbackError")}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6">
          <label
            htmlFor="email"
            className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink3)]"
          >
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            disabled={state === "sending" || state === "sent"}
            className="mt-2 h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink3)] disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={state === "sending" || state === "sent"}
            className="mt-4 h-11 w-full rounded-r2 bg-[var(--a1)] text-[14px] font-semibold text-[var(--onA)] disabled:opacity-60"
          >
            {state === "sending" ? t("sending") : t("send")}
          </button>
        </form>

        {state === "sent" && (
          <p role="status" className="mt-4 text-[13px] text-[var(--a1)]">
            {t("sent")}
          </p>
        )}
        {state === "error" && (
          <p role="alert" className="mt-4 text-[13px] text-[var(--a3)]">
            {t("error")}
          </p>
        )}
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

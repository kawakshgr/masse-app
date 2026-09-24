"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { OtpCodeEntry } from "@/components/OtpCodeEntry";

type State = "idle" | "sending" | "sent" | "error" | "rate-limited";

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

    if (!error) {
      setState("sent");
      return;
    }
    // An hourly cap is not a transient failure: "try again in a moment" would
    // be wrong advice, so it gets its own message.
    const limited =
      error.status === 429 || /rate limit/i.test(error.message ?? "");
    setState(limited ? "rate-limited" : "error");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass lift w-full max-w-[420px] rounded-r4 p-8">
        <p className="font-display text-[14px] font-extrabold tracking-[-.02em] text-[var(--accent)]">
          {tApp("name")}
        </p>
        <h1 className="mt-2 font-display text-[28px] font-extrabold tracking-[-.03em]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[14px] leading-[1.5] text-[var(--ink2)]">
          {t("lede")}
        </p>

        {callbackFailed && (
          <p
            role="alert"
            className="mt-4 rounded-r2 border border-[var(--a3)] px-3 py-2 text-[13px] text-[var(--a3)]"
          >
            {t("callbackError")}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6">
          <label
            htmlFor="email"
            className="block text-[12px] uppercase tracking-[.14em] text-[var(--ink2)]"
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
            className="mt-2 h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink3)] disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={state === "sending" || state === "sent"}
            className="mt-4 h-11 w-full rounded-r2 cta text-[15px] font-semibold text-[var(--on-accent)] disabled:opacity-60"
          >
            {state === "sending" ? t("sending") : t("send")}
          </button>
        </form>

        {state === "sent" && (
          <>
            <p role="status" className="mt-4 text-[14px] text-[var(--accent-soft)]">
              {t("sent")}
            </p>
            {/* Where she was headed, or home: "/" sorts a coach from a client. */}
            <OtpCodeEntry
              email={email}
              // A full load, not a client transition: the next page is rendered
              // by the server, which has to see the session just written.
              onVerified={() => {
                window.location.href = params.get("suite") ?? "/";
              }}
            />
          </>
        )}
        {state === "rate-limited" && (
          <p role="alert" className="mt-4 text-[14px] leading-[1.5] text-[var(--a3)]">
            {t("rateLimited")}
          </p>
        )}
        {state === "error" && (
          <p role="alert" className="mt-4 text-[14px] text-[var(--a3)]">
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

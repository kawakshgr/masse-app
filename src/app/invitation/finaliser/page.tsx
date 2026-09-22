"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { clear, load, toClaimArgs } from "@/lib/onboarding";

/**
 * The client comes back here from her magic link. Her answers waited in local
 * storage; this is where they become her record.
 */
export default function FinalisePage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [failure, setFailure] = useState<"none" | "no-answers" | "refused">(
    "none",
  );
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const answers = load();
      if (!answers) {
        // Opened in another browser: the answers stayed where she typed them.
        // That is a different problem from a code being refused, and it has a
        // different fix, so it gets a different message.
        setFailure("no-answers");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.rpc("claim_invite", toClaimArgs(answers));

      if (error) {
        setFailure("refused");
        return;
      }

      clear();
      router.replace("/aujourdhui");
    })();
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="atmosphere" aria-hidden />
      <div className="glass lift w-full max-w-[420px] rounded-r4 p-8 text-center">
        {failure === "none" ? (
          <p className="text-[13px] text-[var(--ink2)]">{t("finalising")}</p>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-[var(--a3)]">
              {failure === "no-answers" ? t("noAnswers") : t("failed")}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink2)]">
              {failure === "no-answers" ? t("noAnswersBody") : t("failedBody")}
            </p>
            <a
              href="/invitation"
              className="mt-4 flex h-11 w-full items-center justify-center rounded-rp bg-[var(--accent)] text-[13px] font-semibold text-[var(--on-accent)]"
            >
              {t("restart")}
            </a>
          </>
        )}
      </div>
    </main>
  );
}

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
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const answers = load();
      if (!answers) {
        setFailed(true);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.rpc("claim_invite", toClaimArgs(answers));

      if (error) {
        setFailed(true);
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
        {failed ? (
          <>
            <p className="text-[13px] text-[var(--a3)]">{t("failed")}</p>
            <a
              href="/invitation"
              className="mt-4 inline-block text-[12px] text-[var(--accent)] underline"
            >
              {t("back")}
            </a>
          </>
        ) : (
          <p className="text-[13px] text-[var(--ink2)]">{t("finalising")}</p>
        )}
      </div>
    </main>
  );
}

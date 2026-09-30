"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cancelMyRequest } from "@/app/(client)/actions";
import { Secondary } from "./ui";

/** Withdrawing the request: said once, then done — the account goes with it. */
export function CancelRequest() {
  const t = useTranslations("pending");
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return <Secondary onClick={() => setConfirming(true)}>{t("cancel")}</Secondary>;
  }
  return (
    <div className="space-y-2.5 rounded-r2 border border-[var(--a3)] p-3">
      <p className="text-[14px] leading-[1.45]">{t("cancelBody")}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelMyRequest();
              if (result && !result.ok) setFailed(true);
            })
          }
          className="h-11 flex-1 rounded-rp border border-[var(--a3)] text-[14px] font-semibold text-[var(--a3)] disabled:opacity-50"
        >
          {t("cancelConfirm")}
        </button>
        <Secondary onClick={() => setConfirming(false)}>{t("keep")}</Secondary>
      </div>
      {failed && <p className="text-[12.5px] text-[var(--a3)]">{t("cancelFailed")}</p>}
    </div>
  );
}

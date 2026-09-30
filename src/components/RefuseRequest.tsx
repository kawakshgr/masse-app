"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { refuseClient } from "@/app/(coach)/clients/actions";

/**
 * Declining a request, in two taps: the first says what happens — the
 * account and its answers are erased at once — and offers the message to
 * send; the second does it.
 */
export function RefuseRequest({
  clientId,
  firstName,
  declineLink,
}: {
  clientId: string;
  firstName: string;
  declineLink: string | null;
}) {
  const t = useTranslations("request");
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="glass2 h-10 rounded-rp px-5 text-[11.5px] font-bold uppercase tracking-[.1em] text-[var(--a3)]"
      >
        {t("refuse")}
      </button>
    );
  }

  return (
    <div className="w-full rounded-r2 border border-[var(--a3)] p-3">
      <p className="text-[13px] font-semibold text-[var(--a3)]">{t("refuseTitle", { first: firstName })}</p>
      <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--ink2)]">{t("refuseBody")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {declineLink && (
          <a
            href={declineLink}
            target="_blank"
            rel="noopener noreferrer"
            className="glass h-9 rounded-rp px-4 text-[11.5px] font-bold uppercase leading-9 tracking-[.08em]"
          >
            {t("tellFirst")}
          </a>
        )}
        <form action={refuseClient}>
          <input type="hidden" name="client_id" value={clientId} />
          <button
            type="submit"
            className="h-9 rounded-rp border border-[var(--a3)] px-4 text-[11.5px] font-bold uppercase tracking-[.08em] text-[var(--a3)]"
          >
            {t("refuseConfirm")}
          </button>
        </form>
        <button type="button" onClick={() => setConfirming(false)} className="h-9 px-3 text-[12px] text-[var(--ink3)]">
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

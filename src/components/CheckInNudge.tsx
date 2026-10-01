"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { recordCheckInReminder } from "@/app/(coach)/clients/actions";
import { waNumber } from "@/lib/whatsapp";

/**
 * The nudge. Always recorded — her app shows it on Today — and, when her file
 * has a number, also a WhatsApp message already written, because that is
 * where the coach and her clients actually talk.
 */
export function CheckInNudge({
  clientId,
  weekStart,
  firstName,
  message,
  phone,
}: {
  clientId: string;
  weekStart: string;
  firstName: string;
  /** Already written, in the coach's words when she rewrote it. */
  message: string;
  phone: string | null;
}) {
  const t = useTranslations("coachCheckin");
  const [pending, startTransition] = useTransition();
  const number = waNumber(phone);
  const record = () => startTransition(() => recordCheckInReminder(clientId, weekStart));

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {number && (
          <a
            href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            // The link opens WhatsApp; the click also records the nudge.
            onClick={record}
            className="cta inline-flex h-9 items-center rounded-r2 px-4 text-[13px] font-semibold text-[var(--on-accent)]"
          >
            {t("remindWa")}
          </a>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={record}
          className="glass2 h-9 rounded-r2 px-4 text-[13px] font-semibold text-[var(--ink)] disabled:opacity-50"
        >
          {t("remindApp")}
        </button>
      </div>
      <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">
        {t("remindNote", { first: firstName })}
      </p>
    </div>
  );
}

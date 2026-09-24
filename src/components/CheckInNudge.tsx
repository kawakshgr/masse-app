"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { recordCheckInReminder } from "@/app/(coach)/clients/actions";

/** "06 12 34 56 78" → "33612345678", the form wa.me wants. French by default. */
function waNumber(raw: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("0")) digits = `33${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

/**
 * The nudge. Always recorded — her app shows it on Today — and, when her file
 * has a number, also a WhatsApp message already written, because that is
 * where the coach and her clients actually talk.
 */
export function CheckInNudge({
  clientId,
  weekStart,
  firstName,
  phone,
}: {
  clientId: string;
  weekStart: string;
  firstName: string;
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
            href={`https://wa.me/${number}?text=${encodeURIComponent(t("waText", { first: firstName }))}`}
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

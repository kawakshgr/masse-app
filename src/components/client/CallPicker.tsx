"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { intl } from "@/lib/locale";
import { Cta, fieldClass } from "./ui";

/**
 * The coach offered a video call: the client takes one of the coach's free
 * slots, a day then a time. Booked at once; a slot taken meanwhile is said,
 * and the list is read again.
 */
export function CallPicker() {
  const t = useTranslations("calls");
  const locale = intl(useLocale());
  const router = useRouter();
  const [slots, setSlots] = useState<string[] | null>(null);
  const [day, setDay] = useState("");
  const [at, setAt] = useState("");
  const [state, setState] = useState<"idle" | "taken" | "failed">("idle");
  const [pending, startTransition] = useTransition();
  const [round, setRound] = useState(0);

  useEffect(() => {
    let live = true;
    createClient()
      .rpc("my_call_slots")
      .then(({ data }) => {
        if (live) setSlots(((data ?? []) as string[]).map((s) => new Date(s).toISOString()));
      });
    return () => {
      live = false;
    };
  }, [round]);

  // "2026-10-05" in the client's own time zone, to group slots by day.
  const dayOf = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const days = [...new Set((slots ?? []).map(dayOf))];

  if (slots === null) return <p className="text-[13px] text-[var(--ink3)]">{t("pickLoading")}</p>;
  if (slots.length === 0) return <p className="text-[14px] leading-[1.45] text-[var(--ink2)]">{t("pickNone")}</p>;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[1fr_7.5rem] gap-2">
        <select
          aria-label={t("pickDay")}
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            setAt("");
          }}
          className={fieldClass}
        >
          <option value="">{t("pickDay")}</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {new Date(`${d}T12:00`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
            </option>
          ))}
        </select>
        <select
          aria-label={t("pickTime")}
          value={at}
          disabled={!day}
          onChange={(e) => setAt(e.target.value)}
          className={`${fieldClass} tnum disabled:opacity-50`}
        >
          <option value="">{t("pickTime")}</option>
          {slots
            .filter((s) => dayOf(s) === day)
            .map((s) => (
              <option key={s} value={s}>
                {new Date(s).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
              </option>
            ))}
        </select>
      </div>
      <Cta
        disabled={!at || pending}
        onClick={() =>
          startTransition(async () => {
            const { error } = await createClient().rpc("book_call", { p_at: at });
            if (!error) {
              // The server renders the booked call in place of this card.
              router.refresh();
              return;
            }
            setState(error.message.includes("no longer free") ? "taken" : "failed");
            setAt("");
            setRound((n) => n + 1);
          })
        }
      >
        {t("book")}
      </Cta>
      {state !== "idle" && (
        <p role="alert" className="text-[13px] text-[var(--a3)]">
          {state === "taken" ? t("slotTaken") : t("bookFailed")}
        </p>
      )}
    </div>
  );
}

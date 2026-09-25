"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveDailyMetrics } from "@/app/(client)/actions";
import { Card, Choice, Cta, Kicker, RoundButton, clean } from "./ui";
import { StepsChart } from "./StepsChart";

/**
 * Sleep and steps for today — EntryCard.swift, minus Apple Health, which a
 * browser cannot reach. The fields and the save are the same, so a day logged
 * here and a day logged on the iPhone are one row.
 */
export function EntryCard({
  day,
  initial,
  week,
  target,
}: {
  day: string;
  initial: { sleepH: number | null; sleepQuality: number | null; steps: number | null } | null;
  week: (number | null)[];
  target: number | null;
}) {
  const t = useTranslations("entry");
  const router = useRouter();
  const [sleepH, setSleepH] = useState(initial?.sleepH ?? 0);
  const [quality, setQuality] = useState<number | null>(initial?.sleepQuality ?? null);
  const [steps, setSteps] = useState(initial?.steps?.toString() ?? "");
  const [saved, setSaved] = useState(initial !== null);
  const [pending, startTransition] = useTransition();

  function adjust(delta: number) {
    setSleepH((h) => Math.max(0, Math.min(16, h + delta)));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const digits = steps.replace(/\D/g, "");
      const result = await saveDailyMetrics({
        day,
        sleepH: sleepH > 0 ? sleepH : null,
        sleepQuality: quality,
        steps: digits ? Number(digits) : null,
      });
      setSaved(result.ok);
      // The chart is about the week this save just changed.
      router.refresh();
    });
  }

  return (
    <Card className="space-y-3.5">
      <Kicker icon="sleep">{t("title")}</Kicker>

      <div className="flex items-center gap-3">
        <span className="flex-1 text-[15px] text-[var(--ink2)]">{t("sleep")}</span>
        <RoundButton label={`${t("sleep")} −`} onClick={() => adjust(-0.5)}>
          −
        </RoundButton>
        <span className="tnum min-w-[52px] text-center font-display text-[26px] font-extrabold tracking-[-.03em]">
          {clean(sleepH)}
        </span>
        <RoundButton label={`${t("sleep")} +`} onClick={() => adjust(0.5)}>
          +
        </RoundButton>
      </div>

      <div className="space-y-2">
        <p className="text-[13px] text-[var(--ink2)]">{t("quality")}</p>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((level) => (
            <Choice
              key={level}
              selected={quality === level}
              onClick={() => {
                setQuality(quality === level ? null : level);
                setSaved(false);
              }}
            >
              {t(`q${level}`)}
            </Choice>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3">
        <span className="flex-1 text-[15px] text-[var(--ink2)]">{t("steps")}</span>
        <input
          inputMode="numeric"
          value={steps}
          placeholder="—"
          onChange={(event) => {
            setSteps(event.target.value);
            setSaved(false);
          }}
          className="tnum h-11 w-[110px] rounded-r1 bg-[var(--glass2)] px-3 text-right text-[15px] font-semibold text-[var(--ink)] placeholder:text-[var(--ink3)]"
        />
      </label>

      <Cta onClick={save} disabled={pending}>
        {t(saved ? "saved" : "save")}
      </Cta>

      {(target !== null || week.some((d) => d !== null)) && (
        <div className="border-t border-[var(--hair)] pt-3.5">
          <StepsChart days={week} target={target} />
        </div>
      )}
    </Card>
  );
}

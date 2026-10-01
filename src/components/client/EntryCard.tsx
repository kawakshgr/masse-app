"use client";

import { ChoiceTiles } from "@/components/ChoiceTiles";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { saveDailyMetrics } from "@/app/(client)/actions";
import { Card, Cta, Kicker, RoundButton, shown } from "./ui";
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
  const locale = useLocale();
  const router = useRouter();
  // A night starts at 8 h: most are near it, so one tap adjusts instead of
  // sixteen. Nothing is saved until she presses the button.
  const [sleepH, setSleepH] = useState(initial?.sleepH ?? 8);
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
          {shown(sleepH, locale)}
        </span>
        <RoundButton label={`${t("sleep")} +`} onClick={() => adjust(0.5)}>
          +
        </RoundButton>
      </div>

      <div className="space-y-2">
        <p className="text-[13px] text-[var(--ink2)]">{t("quality")}</p>
        {/* Big tiles with a face (1 Oct 2026); a second tap clears it. */}
        <ChoiceTiles
          label={t("quality")}
          columns={3}
          value={quality === null ? null : String(quality)}
          onChange={(v) => {
            setQuality(quality === Number(v) ? null : Number(v));
            setSaved(false);
          }}
          options={[
            { value: "1", label: t("q1"), icon: "faceLow" },
            { value: "2", label: t("q2"), icon: "faceMid" },
            { value: "3", label: t("q3"), icon: "faceHigh" },
          ]}
        />
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

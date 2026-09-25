"use client";

import { SectionTitle } from "@/components/Pane";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setStepsTarget } from "@/app/(coach)/clients/actions";

export type StepDay = {
  /** Monday first, the way the database counts. */
  weekday: number;
  label: string;
  steps: number | null;
};

const PRESETS = [6000, 8000, 10000, 12000];

/**
 * The week's steps, and the target they are read against — set here, where it
 * is read. A target that lives three tabs away from the chart it governs is a
 * target nobody adjusts.
 */
export function StepTarget({
  clientId,
  firstName,
  days,
  target,
}: {
  clientId: string;
  firstName: string;
  days: StepDay[];
  target: number | null;
}) {
  const t = useTranslations("stepsTab");
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(target ?? 8000);

  // One target, every day. The prototype dropped it on rest days; the coach
  // asked for the same figure daily, and a rule nobody wants is a rule that
  // makes a lit bar and a dark taller one impossible to explain.
  const counted = days.filter((day) => day.steps != null);
  const hit = counted.filter((day) => day.steps! >= value).length;

  const ceiling = Math.max(...days.map((day) => day.steps ?? 0), value, 1);

  function save(next: number) {
    setValue(next);
    const body = new FormData();
    body.set("client_id", clientId);
    body.set("steps_target", String(next));
    startTransition(() => {
      void setStepsTarget(body);
    });
  }

  return (
    <section className={`glass rounded-r3 p-4 ${pending ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle icon="steps">{t("targetTitle")}</SectionTitle>
        <div className="flex-1" />
        <span className="tnum text-[12px] text-[var(--ink2)]">
          {counted.length === 0
            ? t("none")
            : hit === 1
              ? t("hitOne", { total: counted.length })
              : t("hit", { count: hit, total: counted.length })}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Step label="−" onClick={() => save(Math.max(500, value - 500))} />
        <span className="tnum min-w-[110px] text-center font-display text-[28px] font-extrabold leading-none tracking-[-.03em]">
          {value.toLocaleString("fr-FR")}
        </span>
        <Step label="+" onClick={() => save(Math.min(100000, value + 500))} />

        <div className="ml-2 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={value === preset}
              onClick={() => save(preset)}
              className={`h-8 rounded-rp border border-[var(--edge)] px-3 text-[12px] font-semibold ${
                value === preset
                  ? "sel text-[var(--ink)]"
                  : "bg-[var(--glass2)] text-[var(--ink2)]"
              }`}
            >
              {preset / 1000}k
            </button>
          ))}
        </div>
      </div>

      {/* The bars carry their own figures, so nothing has to be read off an
          axis that is not there. */}
      <ul className="mt-5 flex items-end gap-2">
        {days.map((day) => {
          const met = day.steps != null && day.steps >= value;
          const height =
            day.steps == null
              ? 4
              : Math.max(8, (day.steps / ceiling) * 100);

          return (
            <li key={day.weekday} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="tnum h-4 text-center text-[11px] text-[var(--ink2)]">
                {day.steps == null
                  ? ""
                  : `${(day.steps / 1000).toFixed(1)}k`}
              </span>
              <div className="flex h-[104px] items-end">
                <div
                  style={{
                    height: `${height}%`,
                    borderRadius: "5px 5px 2px 2px",
                    background: met
                      ? "linear-gradient(180deg, var(--a1), var(--a2))"
                      : day.steps == null
                        ? "var(--hair)"
                        : "var(--glass2)",
                  }}
                  className="w-full border border-[var(--hair)]"
                />
              </div>
              <span className="truncate text-center text-[11px] text-[var(--ink3)]">
                {day.label}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-[var(--hair)] pt-3 text-[12px] leading-[1.5] text-[var(--ink3)]">
        {t("seesTarget", { first: firstName })}
      </p>

    </section>
  );
}

function Step({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="size-9 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] text-[15px] text-[var(--ink2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {label}
    </button>
  );
}

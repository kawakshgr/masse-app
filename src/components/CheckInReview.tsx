"use client";

import { SectionTitle } from "@/components/Pane";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { intl } from "@/lib/locale";
import { BarChart, barDate } from "@/components/BarChart";
import { CheckInSummary } from "@/components/CheckInSummary";
import type { PhotoPose } from "@/lib/supabase/types";

const POSES: PhotoPose[] = ["front", "side", "back"];

const pickClass =
  "tnum h-9 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] pl-3.5 text-[11.5px] font-bold uppercase tracking-[.1em] text-[var(--ink)]";

/** −3,2 kg / +0,5 kg / 0 kg. */
function signedKg(value: number, locale: string): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Math.abs(rounded).toLocaleString(locale, { maximumFractionDigits: 1 });
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${text} kg`;
}

export type ReviewWeek = {
  id: string;
  weekStart: string;
  /** 1-based, counted from her first check-in. */
  number: number;
  bodyweight: number | null;
  feel: string | null;
  pain: string | null;
  adherence: string | null;
  note: string | null;
  waist: number | null;
  chest: number | null;
  hips: number | null;
  thigh: number | null;
  photos: Partial<Record<PhotoPose, { id: string; url: string | null }>>;
  /** Filed from the client's own app rather than typed in by the coach. */
  byClient: boolean;
};

function Measure({
  label,
  value,
  previous,
  noChange,
}: {
  label: string;
  value: number | null;
  previous: number | null;
  noChange: string;
}) {
  const change =
    value != null && previous != null
      ? Math.round((value - previous) * 10) / 10
      : null;

  return (
    <div className="flex items-baseline justify-between gap-2 rounded-r2 border border-[var(--hair)] px-3 py-2">
      <span className="text-[12px] text-[var(--ink3)]">{label}</span>
      <span className="tnum text-[14px] font-semibold">
        {value == null ? "—" : `${value} cm`}
        {change !== null && (
          <span
            className={`ml-1.5 text-[12px] font-bold ${
              change === 0
                ? "text-[var(--ink3)]"
                : change < 0
                  ? "text-[var(--accent-soft)]"
                  : "text-[var(--a2)]"
            }`}
          >
            {change === 0 ? noChange : `${change > 0 ? "+" : "−"}${Math.abs(change)}`}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * One pose, read only. The photos are hers: she takes them in her app, and the
 * coach looks. An empty slot says so rather than offering to fill it.
 */
function PhotoSlot({
  url,
  caption,
  weight,
  emptyLabel,
  onOpen,
}: {
  url: string | null;
  caption: string;
  weight: string;
  emptyLabel: string;
  onOpen: () => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      {url ? (
        <button
          type="button"
          onClick={onOpen}
          className="block w-full cursor-zoom-in overflow-hidden rounded-r3 border border-[var(--edge)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="aspect-[3/4] w-full object-cover" />
        </button>
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-r3 border border-dashed border-[var(--edge)] text-[12px] text-[var(--ink3)]">
          {emptyLabel}
        </div>
      )}

      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-[12px] font-semibold">{caption}</span>
        <span className="tnum shrink-0 text-[12px] text-[var(--ink3)]">{weight}</span>
      </div>
    </div>
  );
}

export function CheckInReview({
  clientId,
  firstName,
  phone,
  weeks,
}: {
  clientId: string;
  firstName: string;
  /** Her WhatsApp number, for the summary to send. */
  phone: string | null;
  weeks: ReviewWeek[];
}) {
  const locale = intl(useLocale());
  const t = useTranslations("review");
  const tFeel = useTranslations("feel");
  const tPain = useTranslations("pain");
  const tAdh = useTranslations("adherence");

  // weeks arrive oldest first, so the baseline is the first and the default
  // selection is the last.
  const [selectedId, setSelectedId] = useState(weeks.at(-1)?.id ?? null);
  // One pose, or all three stacked; and which week the photos are set against.
  const [pose, setPose] = useState<PhotoPose | "all">("front");
  const [compareId, setCompareId] = useState<string | null>(weeks[0]?.id ?? null);
  const [zoom, setZoom] = useState<string | null>(null);

  const baseline = weeks[0] ?? null;
  const selected = weeks.find((w) => w.id === selectedId) ?? weeks.at(-1) ?? null;
  // Week 1 unless she picks another; never the week already on the left.
  const against =
    weeks.find((w) => w.id === compareId && w.id !== selected?.id) ??
    (baseline && baseline.id !== selected?.id ? baseline : (weeks.at(-2) ?? baseline));
  const previous = useMemo(() => {
    if (!selected) return null;
    const index = weeks.findIndex((w) => w.id === selected.id);
    return index > 0 ? weeks[index - 1] : null;
  }, [weeks, selected]);

  const weightBars = useMemo(
    () =>
      weeks.slice(-8).map((w) => ({
        value: w.bodyweight,
        label: `${barDate(w.weekStart, locale)} · ${w.bodyweight?.toLocaleString(locale) ?? "—"} kg`,
        figure: w.bodyweight?.toLocaleString(locale),
        caption: barDate(w.weekStart, locale),
        current: w.id === selected?.id,
      })),
    [weeks, selected, locale],
  );

  if (!selected || !baseline) {
    return (
      <section className="glass rounded-r3 p-4">
        <p className="text-[13px] text-[var(--ink2)]">{t("noCheckins")}</p>
      </section>
    );
  }

  const sinceBaseline =
    selected.bodyweight != null && baseline.bodyweight != null
      ? Math.round((selected.bodyweight - baseline.bodyweight) * 10) / 10
      : null;

  const kg = (v: number | null) => (v == null ? "—" : `${v} kg`);

  return (
    <>
      {/* Which week is on screen — the whole panel follows this. */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-2 text-[12px] font-bold uppercase tracking-[.12em]">
          {t("pickWeek")}
        </span>
        {/* Every week she has filed, newest first, in one dropdown. */}
        <select
          aria-label={t("pickWeek")}
          value={selected.id}
          onChange={(e) => setSelectedId(e.target.value)}
          className="tnum h-9 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] pl-3.5 text-[11.5px] font-bold uppercase tracking-[.1em] text-[var(--ink)]"
          style={{ boxShadow: "var(--spec)" }}
        >
          {[...weeks].reverse().map((week) => (
            <option key={week.id} value={week.id}>
              {t("week", { n: week.number })}
            </option>
          ))}
        </select>
        {selected.byClient && (
          <span className="ml-2 rounded-rp border border-[var(--edge)] px-2.5 py-0.5 text-[12px] text-[var(--a1)]">
            {t("byClient", { first: firstName })}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <section className="glass min-w-[280px] flex-1 rounded-r3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle icon="photo">{t("photos")}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {/* Four choices: a dropdown, not a row of chips. */}
              <select
                aria-label={t("pose")}
                value={pose}
                onChange={(e) => setPose(e.target.value as PhotoPose | "all")}
                className={pickClass}
                style={{ boxShadow: "var(--spec)" }}
              >
                {POSES.map((p) => (
                  <option key={p} value={p}>
                    {t(`poses.${p}`)}
                  </option>
                ))}
                <option value="all">{t("allPoses")}</option>
              </select>
              {weeks.length > 1 && against && (
                <select
                  aria-label={t("compareWith")}
                  value={against.id}
                  onChange={(e) => setCompareId(e.target.value)}
                  className={pickClass}
                  style={{ boxShadow: "var(--spec)" }}
                >
                  {weeks
                    .filter((w) => w.id !== selected.id)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {t("versus", { n: w.number })}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>

          {/* Both sides move together: the comparison is the point. The
              later week on the left, the one it is measured against on the right. */}
          <div className="mt-3 space-y-4">
            {(pose === "all" ? POSES : [pose]).map((p) => (
              <div key={p} className="flex gap-3">
                <PhotoSlot
                  url={selected.photos[p]?.url ?? null}
                  caption={`${t(`poses.${p}`)} · ${t("week", { n: selected.number })}`}
                  weight={kg(selected.bodyweight)}
                  emptyLabel={t("noPhoto")}
                  onOpen={() => setZoom(selected.photos[p]?.url ?? null)}
                />
                {against && against.id !== selected.id && (
                  <PhotoSlot
                    url={against.photos[p]?.url ?? null}
                    caption={`${t(`poses.${p}`)} · ${t("week", { n: against.number })}`}
                    weight={kg(against.bodyweight)}
                    emptyLabel={t("noPhoto")}
                    onOpen={() => setZoom(against.photos[p]?.url ?? null)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* The weight between the two weeks on screen, from the same rows. */}
          {against && against.id !== selected.id && selected.bodyweight != null && against.bodyweight != null && (
            <p className="tnum mt-3 text-[13px] font-semibold">
              {t("between", {
                a: selected.number,
                b: against.number,
                delta: signedKg(selected.bodyweight - against.bodyweight, locale),
              })}
            </p>
          )}

          <p className="mt-3 text-[12px] leading-[1.5] text-[var(--ink3)]">
            {t("discipline")}
          </p>
          <p className="mt-1 text-[12px] text-[var(--ink3)]">
            {t("privacy", { first: firstName })}
          </p>
        </section>

        <div className="min-w-[280px] flex-1 space-y-4">
          <section className="glass rounded-r3 p-4">
            <SectionTitle icon="scale">{t("weight", { weeks: Math.min(8, weeks.length) })}</SectionTitle>
            <p className="tnum mt-2 font-display text-[24px] font-extrabold leading-none tracking-[-.03em]">
              {kg(selected.bodyweight)}
              {sinceBaseline !== null && sinceBaseline !== 0 && (
                <span
                  className={`ml-2 text-[14px] font-bold ${
                    sinceBaseline < 0
                      ? "text-[var(--accent-soft)]"
                      : "text-[var(--a2)]"
                  }`}
                >
                  {sinceBaseline < 0 ? "↓" : "↑"} {Math.abs(sinceBaseline)} kg{" "}
                  <span className="font-normal text-[var(--ink3)]">{t("since")}</span>
                </span>
              )}
            </p>
            <div className="mt-3">
              <BarChart bars={weightBars} ariaLabel={t("weight", { weeks: 8 })} />
            </div>
            <p className="mt-2 text-[11px] text-[var(--ink3)]">{t("weightNote")}</p>
          </section>

          <section className="glass rounded-r3 p-4">
            <SectionTitle icon="scale">{t("measures")}</SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Measure label={t("waist")} value={selected.waist} previous={previous?.waist ?? null} noChange={t("noChange")} />
              <Measure label={t("chest")} value={selected.chest} previous={previous?.chest ?? null} noChange={t("noChange")} />
              <Measure label={t("hips")} value={selected.hips} previous={previous?.hips ?? null} noChange={t("noChange")} />
              <Measure label={t("thigh")} value={selected.thigh} previous={previous?.thigh ?? null} noChange={t("noChange")} />
            </div>
          </section>

          <section className="glass rounded-r3 p-4">
            <SectionTitle icon="note">{t("answers")}</SectionTitle>
            <ul className="mt-2">
              {(
                [
                  [t("qFeel"), selected.feel && tFeel(selected.feel)],
                  [t("qPain"), selected.pain && tPain(selected.pain)],
                  [t("qAdherence"), selected.adherence && tAdh(selected.adherence)],
                ] as const
              ).map(([question, answer]) => (
                <li
                  key={question}
                  className="flex items-center justify-between gap-3 border-b border-[var(--hair)] py-2 last:border-0"
                >
                  <span className="min-w-0 flex-1 text-[12px] text-[var(--ink2)]">
                    {question}
                  </span>
                  <span className="shrink-0 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-2.5 py-0.5 text-[11px] font-bold">
                    {answer || t("noAnswer")}
                  </span>
                </li>
              ))}
            </ul>
            {selected.note && (
              <p className="mt-2 text-[12px] leading-[1.5] text-[var(--ink2)]">
                {selected.note}
              </p>
            )}
          </section>
        </div>
      </div>

      {/* The week on screen, in a few lines to send. A new week, a new text. */}
      <CheckInSummary
        key={selected.id}
        clientId={clientId}
        firstName={firstName}
        phone={phone}
        weekNumber={selected.number}
        week={selected}
        previous={previous}
        baseline={baseline}
      />

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, .88)" }}
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt=""
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-r3 object-contain"
          />
        </div>
      )}
    </>
  );
}

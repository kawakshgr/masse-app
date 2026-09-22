"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  attachCheckInPhoto,
  deleteCheckInPhoto,
} from "@/app/(coach)/clients/actions";
import { BarChart } from "@/components/BarChart";
import type { PhotoPose } from "@/lib/supabase/types";

const POSES: PhotoPose[] = ["front", "side", "back"];
const BUCKET = "check-in-photos";
const MAX_BYTES = 8 * 1024 * 1024;

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

function PhotoSlot({
  url,
  photoId,
  caption,
  weight,
  clientId,
  checkInId,
  pose,
  addLabel,
  removeLabel,
  askLabel,
  confirmLabel,
  cancelLabel,
  onOpen,
}: {
  url: string | null;
  photoId: string | null;
  caption: string;
  weight: string;
  clientId: string;
  checkInId: string | null;
  pose: PhotoPose;
  addLabel: string;
  removeLabel: string;
  askLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  onOpen: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // She cannot retake last week's photo. Deleting one asks twice.
  const [arming, setArming] = useState(false);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    if (!checkInId || file.size > MAX_BYTES) return;
    setBusy(true);

    const supabase = createClient();
    const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    // The client id leads the path: that segment is what storage filters on.
    const path = `${clientId}/${checkInId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    setBusy(false);
    if (error) return;

    startTransition(() => {
      void attachCheckInPhoto(checkInId, clientId, path, pose);
    });
  }

  return (
    <div className="min-w-0 flex-1">
      {url ? (
        <div className="relative">
          <button
            type="button"
            onClick={onOpen}
            className="block w-full cursor-zoom-in overflow-hidden rounded-r3 border border-[var(--edge)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="aspect-[3/4] w-full object-cover" />
          </button>

          {photoId &&
            (arming ? (
              // Over the photo rather than beside it: the slot is narrow, and
              // what is about to be destroyed should be what she is looking at.
              // The question sits on --chrome, not straight on the scrim, so
              // the ink is the theme's own in both light and dark.
              <div
                className="absolute inset-0 flex items-center justify-center rounded-r3 p-2"
                style={{ background: "rgba(0, 0, 0, .42)" }}
              >
                <div className="chrome lift flex w-full flex-col gap-2.5 rounded-r2 p-3 text-center">
                  <span className="text-[12px] leading-snug text-balance text-[var(--ink)]">
                    {askLabel}
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setArming(false)}
                      className="glass2 h-7 rounded-r2 px-3 text-[12px] font-semibold text-[var(--ink)]"
                    >
                      {cancelLabel}
                    </button>
                    <form action={deleteCheckInPhoto} onSubmit={() => setArming(false)}>
                      <input type="hidden" name="photo_id" value={photoId} />
                      <input type="hidden" name="client_id" value={clientId} />
                      <button
                        type="submit"
                        className="h-7 rounded-r2 border border-[var(--a3)] px-3 text-[12px] font-semibold text-[var(--a3)]"
                      >
                        {confirmLabel}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setArming(true)}
                aria-label={removeLabel}
                title={removeLabel}
                className="chrome absolute top-2 right-2 flex size-6 items-center justify-center rounded-rp text-[12px] leading-none text-[var(--ink2)] hover:text-[var(--a3)]"
              >
                ✕
              </button>
            ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={!checkInId || busy}
          className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-r3 border border-dashed border-[var(--edge)] text-[12px] text-[var(--ink3)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
        >
          <span className="text-[18px] leading-none">＋</span>
          <span className="mt-1">{addLabel}</span>
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

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
  weeks,
}: {
  clientId: string;
  firstName: string;
  weeks: ReviewWeek[];
}) {
  const t = useTranslations("review");
  const tFeel = useTranslations("feel");
  const tPain = useTranslations("pain");
  const tAdh = useTranslations("adherence");

  // weeks arrive oldest first, so the baseline is the first and the default
  // selection is the last.
  const [selectedId, setSelectedId] = useState(weeks.at(-1)?.id ?? null);
  const [pose, setPose] = useState<PhotoPose>("front");
  const [zoom, setZoom] = useState<string | null>(null);

  const baseline = weeks[0] ?? null;
  const selected = weeks.find((w) => w.id === selectedId) ?? weeks.at(-1) ?? null;
  const previous = useMemo(() => {
    if (!selected) return null;
    const index = weeks.findIndex((w) => w.id === selected.id);
    return index > 0 ? weeks[index - 1] : null;
  }, [weeks, selected]);

  const weightBars = useMemo(
    () =>
      weeks.slice(-8).map((w) => ({
        value: w.bodyweight,
        label: `${w.weekStart} · ${w.bodyweight ?? "—"} kg`,
        current: w.id === selected?.id,
      })),
    [weeks, selected],
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
        <span className="mr-1 text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
          {t("pickWeek")}
        </span>
        {weeks.slice(-6).map((week) => (
          <button
            key={week.id}
            type="button"
            aria-pressed={week.id === selected.id}
            onClick={() => setSelectedId(week.id)}
            className={`tnum h-7 rounded-rp px-2.5 text-[12px] font-semibold ${
              week.id === selected.id
                ? "sel text-[var(--ink)]"
                : "border border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
            }`}
          >
            {t("week", { n: week.number })}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <section className="glass min-w-[280px] flex-1 rounded-r3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("photos")}
            </h3>
            <div className="flex gap-1">
              {POSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={p === pose}
                  onClick={() => setPose(p)}
                  className={`h-7 rounded-rp px-2.5 text-[12px] font-semibold ${
                    p === pose
                      ? "sel text-[var(--ink)]"
                      : "border border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
                  }`}
                >
                  {t(`poses.${p}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Both sides move together: the comparison is the point. */}
          <div className="mt-3 flex gap-3">
            <PhotoSlot
              url={selected.photos[pose]?.url ?? null}
              photoId={selected.photos[pose]?.id ?? null}
              caption={`${t(`poses.${pose}`)} · ${t("thisWeek")}`}
              weight={kg(selected.bodyweight)}
              clientId={clientId}
              checkInId={selected.id}
              pose={pose}
              addLabel={t("addPose")}
              removeLabel={t("removePhoto")}
              askLabel={t("askRemovePhoto")}
              confirmLabel={t("confirmRemovePhoto")}
              cancelLabel={t("cancel")}
              onOpen={() => setZoom(selected.photos[pose]?.url ?? null)}
            />
            <PhotoSlot
              url={baseline.photos[pose]?.url ?? null}
              photoId={baseline.photos[pose]?.id ?? null}
              caption={`${t(`poses.${pose}`)} · ${t("baseline")}`}
              weight={kg(baseline.bodyweight)}
              clientId={clientId}
              checkInId={baseline.id}
              pose={pose}
              addLabel={t("addPose")}
              removeLabel={t("removePhoto")}
              askLabel={t("askRemovePhoto")}
              confirmLabel={t("confirmRemovePhoto")}
              cancelLabel={t("cancel")}
              onOpen={() => setZoom(baseline.photos[pose]?.url ?? null)}
            />
          </div>

          <p className="mt-3 text-[12px] leading-[1.5] text-[var(--ink3)]">
            {t("discipline")}
          </p>
          <p className="mt-1 text-[12px] text-[var(--ink3)]">
            {t("privacy", { first: firstName })}
          </p>
        </section>

        <div className="min-w-[280px] flex-1 space-y-4">
          <section className="glass rounded-r3 p-4">
            <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("weight", { weeks: Math.min(8, weeks.length) })}
            </h3>
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
            <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("measures")}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Measure label={t("waist")} value={selected.waist} previous={previous?.waist ?? null} noChange={t("noChange")} />
              <Measure label={t("chest")} value={selected.chest} previous={previous?.chest ?? null} noChange={t("noChange")} />
              <Measure label={t("hips")} value={selected.hips} previous={previous?.hips ?? null} noChange={t("noChange")} />
              <Measure label={t("thigh")} value={selected.thigh} previous={previous?.thigh ?? null} noChange={t("noChange")} />
            </div>
          </section>

          <section className="glass rounded-r3 p-4">
            <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("answers")}
            </h3>
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

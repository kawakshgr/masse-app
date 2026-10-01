"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ensureCheckIn, submitCheckIn } from "@/app/(client)/actions";
import type { CheckInRow } from "@/lib/supabase/types";
import { Card, CardTitle, Cta, Kicker, Secondary, clean } from "./ui";
import { PoseGrid } from "./PoseGrid";
import { ChoiceTiles } from "@/components/ChoiceTiles";

const FEELS = ["Strong", "Steady", "Heavy"] as const;
const PAINS = ["None", "Minor", "Need to talk"] as const;
const ADHERENCES = ["All of it", "Most", "Struggled"] as const;
const FEEL_ICONS = { Strong: "faceHigh", Steady: "faceMid", Heavy: "faceLow" } as const;
const PAIN_ICONS = { None: "faceHigh", Minor: "pain", "Need to talk": "whatsapp" } as const;
const ADHERENCE_ICONS = { "All of it": "trophy", Most: "up", Struggled: "faceLow" } as const;

type Existing = Pick<
  CheckInRow,
  | "feel" | "pain" | "adherence" | "bodyweight_kg" | "waist_cm" | "chest_cm"
  | "hips_cm" | "thigh_cm" | "note" | "author" | "reviewed_at"
>;

/**
 * Her weekly check-in, filed by her — CheckInCard.swift. One of three things,
 * never two: her coach already filed this week, she did, or it is waiting.
 */
export function CheckInCard({
  weekStart,
  clientId,
  existing,
  late,
  upcoming,
  prompt,
  nudged,
}: {
  /** The week open for filing — last week's while it is late. */
  weekStart: string;
  clientId: string;
  existing: Existing | null;
  late: boolean;
  /** Not open yet: the day is shown, the form is not. */
  upcoming: boolean;
  /** When it is due, or until when it can be caught up, already worded. */
  prompt: string;
  /** Her coach asked for this one. */
  nudged: boolean;
}) {
  const t = useTranslations("bilan");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <Card className="space-y-2.5">
      <Kicker icon="checkIns">{t(late ? "lastWeekTitle" : "title")}</Kicker>

      {existing?.author === "coach" ? (
        <p className="text-[15px] leading-[1.45] text-[var(--ink2)]">{t("byCoach")}</p>
      ) : existing ? (
        <>
          <CardTitle>{t("done")}</CardTitle>
          <p
            className={`text-[13px] ${
              existing.reviewed_at ? "text-[var(--a1)]" : "text-[var(--ink3)]"
            }`}
          >
            {t(existing.reviewed_at ? "reviewed" : "waiting")}
          </p>
          {/* Still hers to correct, until her coach has read it. */}
          {!existing.reviewed_at && (
            <Secondary onClick={() => setOpen(true)}>{tCommon("save")}</Secondary>
          )}
        </>
      ) : (
        <>
          <p className="text-[15px] leading-[1.45] text-[var(--ink2)]">{prompt}</p>
          {nudged && (
            <p className="text-[13px] font-semibold text-[var(--a2)]">{t("nudged")}</p>
          )}
          {!upcoming && <Cta onClick={() => setOpen(true)}>{t("open")}</Cta>}
        </>
      )}

      {open && (
        <CheckInSheet
          weekStart={weekStart}
          clientId={clientId}
          existing={existing?.author === "client" ? existing : null}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}

function CheckInSheet({
  weekStart,
  clientId,
  existing,
  onClose,
}: {
  weekStart: string;
  clientId: string;
  existing: Existing | null;
  onClose: () => void;
}) {
  const t = useTranslations("bilan");
  const tCheckin = useTranslations("checkin");
  const tCommon = useTranslations("common");
  const tFeel = useTranslations("feel");
  const tPain = useTranslations("pain");
  const tAdherence = useTranslations("adherence");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const text = (n: number | null | undefined) => (n == null ? "" : clean(Number(n)));
  const [feel, setFeel] = useState(existing?.feel ?? null);
  const [pain, setPain] = useState(existing?.pain ?? null);
  const [adherence, setAdherence] = useState(existing?.adherence ?? null);
  const [weight, setWeight] = useState(text(existing?.bodyweight_kg));
  const [waist, setWaist] = useState(text(existing?.waist_cm));
  const [chest, setChest] = useState(text(existing?.chest_cm));
  const [hips, setHips] = useState(text(existing?.hips_cm));
  const [thigh, setThigh] = useState(text(existing?.thigh_cm));
  const [note, setNote] = useState(existing?.note ?? "");
  const [checkInId, setCheckInId] = useState<string | null>(null);

  // A photo hangs off a check-in row, and she should not have to answer three
  // questions before she is allowed to take one.
  useEffect(() => {
    void ensureCheckIn(weekStart).then(setCheckInId);
  }, [weekStart]);

  // The page behind does not scroll while the sheet is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /** A blank field is nothing measured, not zero centimetres. */
  const measure = (value: string) => {
    const n = Number(value.replace(",", ".").trim());
    return value.trim() === "" || Number.isNaN(n) ? null : n;
  };

  function submit() {
    startTransition(async () => {
      await submitCheckIn({
        weekStart,
        feel,
        pain,
        adherence,
        bodyweightKg: measure(weight),
        waistCm: measure(waist),
        chestCm: measure(chest),
        hipsCm: measure(hips),
        thighCm: measure(thigh),
        note: note.trim() || null,
      });
      router.refresh();
      onClose();
    });
  }

  // One question a screen, as the questionnaire she signed up with (1 Oct
  // 2026): big tiles, a bar that fills, nothing required. A tile answered
  // moves on by itself.
  const steps = ["feel", "pain", "adherence", "weight", "measures", "photos", "note"] as const;
  const [step, setStep] = useState(0);
  const last = step === steps.length - 1;
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const answer = <T,>(set: (v: T) => void) => (value: T) => {
    set(value);
    window.setTimeout(next, 260);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-30 flex flex-col bg-[var(--bg)]"
    >
      <div className="atmosphere" aria-hidden />
      <div className="mx-auto w-full max-w-[560px] px-[22px] pt-[calc(env(safe-area-inset-top)+18px)]">
        <div className="h-1.5 overflow-hidden rounded-rp bg-[var(--glass2)]">
          <div
            className="h-full rounded-rp transition-[width] duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%`, background: "linear-gradient(90deg, var(--a1), var(--a2))" }}
          />
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
              {t("stepOf", { n: step + 1, total: steps.length })}
            </p>
            <h1 className="mt-1 font-display text-[28px] font-extrabold uppercase leading-[1.05] tracking-[-.02em]">
              {t(`steps.${steps[step]}`)}
            </h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tCommon("cancel")}
            className="flex size-11 shrink-0 items-center justify-center rounded-rp bg-[var(--glass2)] text-[22px] leading-none text-[var(--ink2)]"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mx-auto min-h-0 w-full max-w-[560px] flex-1 overflow-y-auto px-[22px] py-5">
        {steps[step] === "feel" && (
          <ChoiceTiles
            label={tCheckin("feel")}
            columns={3}
            value={feel}
            onChange={answer(setFeel)}
            options={FEELS.map((v) => ({ value: v, label: tFeel(v), icon: FEEL_ICONS[v] }))}
          />
        )}
        {steps[step] === "pain" && (
          <ChoiceTiles
            label={tCheckin("pain")}
            columns={3}
            value={pain}
            onChange={answer(setPain)}
            options={PAINS.map((v) => ({ value: v, label: tPain(v), icon: PAIN_ICONS[v] }))}
          />
        )}
        {steps[step] === "adherence" && (
          <ChoiceTiles
            label={tCheckin("adherence")}
            columns={3}
            value={adherence}
            onChange={answer(setAdherence)}
            options={ADHERENCES.map((v) => ({ value: v, label: tAdherence(v), icon: ADHERENCE_ICONS[v] }))}
          />
        )}
        {steps[step] === "weight" && (
          <label className="block space-y-3">
            <span className="block text-[13px] text-[var(--ink2)]">{t("weightHint")}</span>
            <span className="flex items-baseline justify-center gap-2 rounded-r3 bg-[var(--glass2)] px-4 py-6">
              <input
                inputMode="decimal"
                autoFocus
                value={weight}
                placeholder="—"
                onChange={(event) => setWeight(event.target.value)}
                className="tnum w-[5ch] min-w-0 bg-transparent text-center font-display text-[44px] font-extrabold text-[var(--ink)] placeholder:text-[var(--ink3)] focus:outline-none"
              />
              <span className="text-[18px] font-semibold text-[var(--ink3)]">kg</span>
            </span>
          </label>
        )}
        {steps[step] === "measures" && (
          <div className="space-y-3">
            <p className="text-[13px] text-[var(--ink2)]">{t("measuresHint")}</p>
            {/* Measurements ride on the check-in, so a delta is one row apart. */}
            <div className="flex gap-2">
              <Measure label={t("waist")} unit="cm" value={waist} onChange={setWaist} />
              <Measure label={t("chest")} unit="cm" value={chest} onChange={setChest} />
            </div>
            <div className="flex gap-2">
              <Measure label={t("hips")} unit="cm" value={hips} onChange={setHips} />
              <Measure label={t("thigh")} unit="cm" value={thigh} onChange={setThigh} />
            </div>
          </div>
        )}
        {steps[step] === "photos" && (
          <div className="space-y-3">
            <p className="text-[13px] text-[var(--ink2)]">{t("photosHint")}</p>
            {checkInId && <PoseGrid checkInId={checkInId} clientId={clientId} />}
          </div>
        )}
        {steps[step] === "note" && (
          <label className="block space-y-2">
            <span className="block text-[13px] text-[var(--ink2)]">{tCheckin("note")}</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              rows={5}
              className="w-full rounded-r2 bg-[var(--glass2)] p-3 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
            />
          </label>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-[560px] gap-2 px-[22px] pb-[max(14px,calc(env(safe-area-inset-bottom)+10px-var(--app-gap,0px)))] pt-2">
        {step > 0 && (
          <Secondary onClick={() => setStep(step - 1)} className="flex-1">
            {tCommon("back")}
          </Secondary>
        )}
        {last ? (
          <Cta onClick={submit} disabled={pending} className="flex-[2]">
            {tCheckin("save")}
          </Cta>
        ) : (
          <Cta onClick={next} className="flex-[2]">
            {t("next")}
          </Cta>
        )}
      </div>
    </div>
  );
}

function Measure({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block flex-1 space-y-2">
      <span className="block text-[13px] text-[var(--ink2)]">{label}</span>
      <span className="flex items-center gap-1.5 rounded-r1 bg-[var(--glass2)] p-3">
        <input
          inputMode="decimal"
          value={value}
          placeholder="—"
          onChange={(event) => onChange(event.target.value)}
          className="tnum w-full min-w-0 bg-transparent text-[15px] font-semibold text-[var(--ink)] placeholder:text-[var(--ink3)] focus:outline-none"
        />
        <span className="text-[13px] text-[var(--ink3)]">{unit}</span>
      </span>
    </label>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ensureCheckIn, submitCheckIn } from "@/app/(client)/actions";
import type { CheckInRow } from "@/lib/supabase/types";
import { Card, CardTitle, Choice, Cta, Kicker, Secondary, clean } from "./ui";
import { PoseGrid } from "./PoseGrid";

const FEELS = ["Strong", "Steady", "Heavy"] as const;
const PAINS = ["None", "Minor", "Need to talk"] as const;
const ADHERENCES = ["All of it", "Most", "Struggled"] as const;

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
      <Kicker>{t(late ? "lastWeekTitle" : "title")}</Kicker>

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-30 overflow-y-auto bg-[var(--bg)]"
    >
      <div className="atmosphere" aria-hidden />
      <div className="mx-auto max-w-[560px] space-y-[18px] px-[22px] pt-[calc(env(safe-area-inset-top)+22px)] pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <div className="space-y-2">
          <h1 className="font-display text-[30px] font-extrabold tracking-[-.035em]">
            {t("title")}
          </h1>
          <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("lede")}</p>
        </div>

        <Pick label={tCheckin("feel")} options={FEELS} value={feel} onChange={setFeel} word={tFeel} />
        <Pick label={tCheckin("pain")} options={PAINS} value={pain} onChange={setPain} word={tPain} />
        <Pick
          label={tCheckin("adherence")}
          options={ADHERENCES}
          value={adherence}
          onChange={setAdherence}
          word={tAdherence}
        />

        <Measure label={tCheckin("bodyweight")} unit="kg" value={weight} onChange={setWeight} />
        {/* Measurements ride on the check-in, so a delta is one row apart. */}
        <div className="flex gap-2">
          <Measure label={t("waist")} unit="cm" value={waist} onChange={setWaist} />
          <Measure label={t("chest")} unit="cm" value={chest} onChange={setChest} />
        </div>
        <div className="flex gap-2">
          <Measure label={t("hips")} unit="cm" value={hips} onChange={setHips} />
          <Measure label={t("thigh")} unit="cm" value={thigh} onChange={setThigh} />
        </div>

        {checkInId && <PoseGrid checkInId={checkInId} clientId={clientId} />}

        <label className="block space-y-2">
          <span className="block text-[13px] text-[var(--ink2)]">{tCheckin("note")}</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("notePlaceholder")}
            rows={4}
            className="w-full rounded-r1 bg-[var(--glass2)] p-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
          />
        </label>

        <Cta onClick={submit} disabled={pending}>
          {tCheckin("save")}
        </Cta>
        <Secondary onClick={onClose} className="w-full">
          {tCommon("cancel")}
        </Secondary>
      </div>
    </div>
  );
}

function Pick<T extends string>({
  label,
  options,
  value,
  onChange,
  word,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  word: (key: string) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-[var(--ink2)]">{label}</p>
      <div className="flex gap-1.5">
        {options.map((option) => (
          <Choice
            key={option}
            selected={value === option}
            onClick={() => onChange(value === option ? null : option)}
            className="min-h-12"
          >
            {/* The enum value is the key: the database stores English. */}
            {word(option)}
          </Choice>
        ))}
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

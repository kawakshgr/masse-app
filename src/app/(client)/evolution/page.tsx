import { getLocale, getTranslations } from "next-intl/server";
import { clientSession } from "@/lib/clientData";
import { loadReviewWeeks } from "@/lib/reviewWeeks";
import { loadStrength } from "@/lib/history";
import { Card, Kicker, ScreenHeader } from "@/components/client/ui";
import { BarChart, barDate } from "@/components/BarChart";
import { StrengthPanel } from "@/components/StrengthPanel";
import { EvolutionPhotos, type PosePair } from "@/components/client/EvolutionPhotos";
import type { CheckInRow, PhotoPose } from "@/lib/supabase/types";

const POSES: PhotoPose[] = ["front", "side", "back"];
const MEASURES = [
  ["waist", "waist"],
  ["chest", "chest"],
  ["hips", "hips"],
  ["thigh", "thigh"],
] as const;

/**
 * Mon évolution (1 Oct 2026): what the client's own check-ins add up to —
 * weight week by week, measurements against the first, before and after on
 * the same pose, and strength. Reported, never judged: a change is said in
 * the accent whichever way it goes, the goal being theirs and their coach's.
 */
export default async function EvolutionPage() {
  const { supabase, client } = await clientSession();
  const t = await getTranslations("evolution");
  const tReview = await getTranslations("review");
  const locale = (await getLocale()) === "en" ? "en-GB" : "fr-FR";

  const rowsRead = supabase
    .from("check_ins")
    .select("*")
    .eq("client_id", client.id)
    .order("week_start_date", { ascending: true })
    .limit(104)
    .then(({ data }) => (data ?? []) as CheckInRow[]);
  const [{ weeks }, strength] = await Promise.all([
    loadReviewWeeks(supabase, client.id, rowsRead),
    loadStrength(supabase, client.id),
  ]);

  const fig = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });
  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${fig(Math.abs(Math.round(n * 10) / 10))}`;
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long" });

  const weighed = weeks.filter((w) => w.bodyweight != null);
  const firstW = weighed[0];
  const lastW = weighed.at(-1);

  // The first and the latest check-in holding each pose.
  const pairs: PosePair[] = POSES.flatMap((pose) => {
    const withPose = weeks.filter((w) => w.photos[pose]?.url);
    if (withPose.length < 2) return [];
    const [a, b] = [withPose[0], withPose.at(-1)!];
    const side = (w: typeof a) => ({
      url: w.photos[pose]!.url!,
      label: t("weekOf", { date: day(w.weekStart) }),
      weight: w.bodyweight == null ? "" : `${fig(w.bodyweight)} kg`,
    });
    return [{ pose, before: side(a), after: side(b) }];
  });

  const measures = MEASURES.map(([key, label]) => {
    const values = weeks.map((w) => w[key]).filter((v): v is number => v != null);
    return { key, label: tReview(label), first: values[0] ?? null, last: values.at(-1) ?? null };
  }).filter((m) => m.last != null);

  return (
    <>
      <ScreenHeader
        kicker={weeks[0] ? t("since", { date: day(weeks[0].weekStart) }) : t("kicker")}
        title={t("title")}
        sub={weeks.length ? t("count", { count: weeks.length }) : null}
      />

      {weeks.length === 0 && (
        <Card className="space-y-2">
          <Kicker icon="chart">{t("emptyTitle")}</Kicker>
          <p className="text-[14px] leading-[1.5] text-[var(--ink2)]">{t("emptyHint")}</p>
        </Card>
      )}

      {lastW && (
        <Card className="space-y-3.5">
          <Kicker icon="scale">{t("weight")}</Kicker>
          <div className="flex items-baseline gap-2.5">
            <span className="tnum font-display text-[34px] font-extrabold leading-none tracking-[-.03em]">
              {fig(lastW.bodyweight!)} kg
            </span>
            {firstW && firstW.id !== lastW.id && (
              <span className="tnum text-[15px] font-bold text-[var(--accent)]">
                {signed(lastW.bodyweight! - firstW.bodyweight!)} kg
              </span>
            )}
          </div>
          {firstW && firstW.id !== lastW.id && (
            <p className="text-[13px] text-[var(--ink2)]">{t("weightSince", { date: day(firstW.weekStart), from: fig(firstW.bodyweight!) })}</p>
          )}
          {weighed.length > 1 && (
            <BarChart
              ariaLabel={t("weight")}
              bars={weighed.slice(-12).map((w, i, all) => ({
                value: w.bodyweight,
                label: `${barDate(w.weekStart, locale)} · ${fig(w.bodyweight!)} kg`,
                figure: fig(w.bodyweight!),
                caption: barDate(w.weekStart, locale),
                current: i === all.length - 1,
              }))}
            />
          )}
        </Card>
      )}

      {measures.length > 0 && (
        <Card className="space-y-3.5">
          <Kicker icon="note">{t("measures")}</Kicker>
          <div className="grid grid-cols-2 gap-2.5">
            {measures.map((m) => (
              <div key={m.key} className="glass2 flex min-h-[92px] flex-col justify-between rounded-r3 p-3">
                <span className="text-[11.5px] font-bold uppercase tracking-[.08em] text-[var(--ink2)]">{m.label}</span>
                <span className="flex items-baseline justify-between gap-1.5">
                  <span className="tnum whitespace-nowrap font-display text-[20px] font-extrabold leading-none tracking-[-.03em]">{fig(m.last!)} cm</span>
                  {m.first != null && m.first !== m.last && (
                    <span className="tnum text-[13px] font-bold text-[var(--accent)]">{signed(m.last! - m.first)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          {weeks.length > 1 && <p className="text-[12.5px] text-[var(--ink3)]">{t("measuresHint", { date: day(weeks[0].weekStart) })}</p>}
        </Card>
      )}

      <Card className="space-y-3.5">
        <Kicker icon="photo">{t("photos")}</Kicker>
        {pairs.length > 0 ? (
          <EvolutionPhotos pairs={pairs} />
        ) : (
          <p className="text-[14px] leading-[1.5] text-[var(--ink2)]">{t("photosEmpty")}</p>
        )}
      </Card>

      {Object.keys(strength).length > 0 && <StrengthPanel strengthByExercise={strength} client />}
    </>
  );
}

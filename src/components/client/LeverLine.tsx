import { getTranslations } from "next-intl/server";
import { signed, type CycleLevers } from "@/lib/clientData";

/**
 * "Ajusté pour ta phase lutéale · charge −5 %, séries −1, RPE max 8" — the
 * reason beside numbers that differ from what the coach typed. Derived from
 * the same levers that changed them, so the sentence cannot disagree.
 */
export async function LeverLine({
  levers,
  kind,
}: {
  levers: CycleLevers;
  kind: "training" | "nutrition";
}) {
  const t = await getTranslations("cycleAdjust");
  const tPhase = await getTranslations("phase");

  const parts =
    kind === "training"
      ? [
          levers.loadPct !== 0 && t("load", { pct: signed(levers.loadPct) }),
          levers.setsDelta !== 0 && t("sets", { delta: signed(levers.setsDelta) }),
          levers.rpeCap !== null && t("rpe", { rpe: levers.rpeCap }),
        ]
      : [
          levers.kcalDelta !== 0 && t("kcal", { delta: signed(levers.kcalDelta) }),
          levers.carbsDelta !== 0 && t("carbs", { delta: signed(levers.carbsDelta) }),
        ];

  return (
    <p className="text-[13px] leading-[1.45] text-[var(--a2)]">
      {t("title", { phase: tPhase(levers.phase) })} · {parts.filter(Boolean).join(", ")}
    </p>
  );
}

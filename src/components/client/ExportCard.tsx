"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Kicker, fieldClass } from "@/components/client/ui";

/**
 * Their programme and meal plan, on paper: one dropdown for what goes in,
 * one button for the file. The PDF is drawn on the server with today's
 * figures and the coach's logo.
 */
export function ExportCard({ initial = "both" }: { initial?: "both" | "programme" | "plan" }) {
  const t = useTranslations("export");
  const [what, setWhat] = useState(initial);
  const href = what === "both" ? "/export" : `/export?contenu=${what}`;

  return (
    <Card className="space-y-3.5">
      <Kicker icon="note">{t("title")}</Kicker>
      <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("lede")}</p>
      <select
        aria-label={t("what")}
        value={what}
        onChange={(e) => setWhat(e.target.value as typeof what)}
        className={fieldClass}
      >
        <option value="both">{t("both")}</option>
        <option value="programme">{t("programme")}</option>
        <option value="plan">{t("plan")}</option>
      </select>
      <a
        href={href}
        className="cta flex h-[52px] w-full items-center justify-center rounded-rp text-[15px] font-semibold text-[var(--onA)]"
      >
        {t("download")}
      </a>
    </Card>
  );
}

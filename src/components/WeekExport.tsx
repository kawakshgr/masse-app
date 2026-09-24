"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { EditorSession } from "@/components/WeekEditor";

/**
 * Text to the clipboard, or the browser's own print dialog for PDF. No export
 * library: the week is a handful of lines, and print-to-PDF is already on every
 * machine the coach owns.
 */
export function WeekExport({
  programmeName,
  weekNumber,
  sessions,
}: {
  programmeName: string;
  weekNumber: number;
  sessions: EditorSession[];
}) {
  const t = useTranslations("exportW");
  const tDays = useTranslations("days");
  const [copied, setCopied] = useState(false);

  function buildText(): string {
    const lines: string[] = [
      `${programmeName} — ${t("week", { n: weekNumber })}`,
      "",
    ];

    for (let day = 0; day < 7; day += 1) {
      const session = sessions.find((s) => s.day_index === day);
      const dayName = tDays(String(day));

      if (!session) {
        lines.push(`${dayName} — ${t("rest")}`);
        continue;
      }

      lines.push(`${dayName}${session.name ? ` — ${session.name}` : ""}`);
      for (const exercise of session.exercises) {
        const parts = [exercise.name, exercise.scheme].filter(Boolean).join(" — ");
        lines.push(`  ${parts}${exercise.cue ? ` (${exercise.cue})` : ""}`);
      }
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the print view still carries the same content.
    }
  }

  return (
    <div className="flex gap-2 print:hidden">
      <button
        type="button"
        onClick={copy}
        className="glass2 h-8 shrink-0 rounded-r2 px-3 text-[12px] font-semibold text-[var(--ink2)]"
      >
        {copied ? t("copied") : t("copy")}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="glass2 h-8 shrink-0 rounded-r2 px-3 text-[12px] font-semibold text-[var(--ink2)]"
      >
        {t("print")}
      </button>
    </div>
  );
}

/** Rendered only on paper: the same week, without the editing chrome. */
export function WeekPrintout({
  programmeName,
  weekNumber,
  sessions,
}: {
  programmeName: string;
  weekNumber: number;
  sessions: EditorSession[];
}) {
  const t = useTranslations("exportW");
  const tDays = useTranslations("days");

  return (
    <div className="hidden print:block">
      <h1 style={{ fontSize: "18pt", fontWeight: 800, marginBottom: "4pt" }}>
        {programmeName}
      </h1>
      <p style={{ fontSize: "11pt", marginBottom: "12pt" }}>
        {t("week", { n: weekNumber })}
      </p>

      {Array.from({ length: 7 }, (_, day) => {
        const session = sessions.find((s) => s.day_index === day);
        return (
          <div key={day} style={{ marginBottom: "10pt", breakInside: "avoid" }}>
            <h2 style={{ fontSize: "12pt", fontWeight: 700 }}>
              {tDays(String(day))}
              {session?.name ? ` — ${session.name}` : session ? "" : ` — ${t("rest")}`}
            </h2>
            {session && (
              <ul style={{ margin: "4pt 0 0 14pt", padding: 0 }}>
                {session.exercises.map((exercise) => (
                  <li key={exercise.id} style={{ fontSize: "11pt", marginBottom: "2pt" }}>
                    {[exercise.name, exercise.scheme].filter(Boolean).join(" — ")}
                    {exercise.cue ? ` (${exercise.cue})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

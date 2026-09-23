"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { importHevyTemplates } from "@/app/(coach)/programmes/actions";

/**
 * Her Hevy catalogue, brought in. Folded away until she wants it, because it is
 * an occasional errand — and absent entirely when no key is configured, rather
 * than a button that cannot work.
 */
export function HevyImport({ configured }: { configured: boolean }) {
  const t = useTranslations("hevy");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (!configured) {
    return (
      <p className="px-1 text-[11.5px] leading-[1.45] text-[var(--ink3)]">
        {t("notConfigured")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const outcome = await importHevyTemplates();
            setResult(
              outcome.reason
                ? t(`error.${outcome.reason}`)
                : t("done", { added: outcome.added, skipped: outcome.skipped }),
            );
          })
        }
        className="glass2 h-9 w-full rounded-r2 text-[12.5px] font-semibold text-[var(--ink2)] disabled:opacity-60"
      >
        {pending ? t("running") : t("import")}
      </button>
      {result && (
        <p className="px-1 text-[11.5px] leading-[1.45] text-[var(--ink2)]">{result}</p>
      )}
    </div>
  );
}

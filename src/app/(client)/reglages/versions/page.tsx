import { getLocale, getTranslations } from "next-intl/server";
import releases from "@/lib/releases.json";
import { BackHeader, Card } from "@/components/client/ui";

/** Every version, newest first — the same file the iPhone reads. */
export default async function ReleasesPage() {
  const t = await getTranslations("settings");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const english = locale === "en";

  return (
    <>
      <BackHeader href="/reglages" back={tCommon("back")} title={t("releases")} />
      {releases.map((release) => (
        <Card key={release.version} className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[19px] font-extrabold tracking-[-.03em]">
              {t("version", { version: release.version })}
            </h2>
            <span className="text-[13px] text-[var(--ink3)]">
              {new Date(`${release.date}T12:00:00Z`).toLocaleDateString(english ? "en-GB" : "fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <ul className="space-y-2">
            {(english ? release.en : release.fr).map((note) => (
              <li key={note} className="flex gap-2 text-[15px] leading-[1.45] text-[var(--ink2)]">
                <span aria-hidden className="text-[var(--a1)]">·</span>
                {note}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}

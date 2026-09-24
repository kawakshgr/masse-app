import { getTranslations } from "next-intl/server";

/**
 * Coach — present and honest about not being built. One line of copy, and
 * nothing that looks tappable: SoonView on the iPhone.
 */
export default async function CoachPage() {
  const tNav = await getTranslations("clientNav");
  const tShell = await getTranslations("shell");
  const tSoon = await getTranslations("soonCopy");

  return (
    <div className="space-y-3 pt-11">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-[30px] font-extrabold tracking-[-.035em] text-[var(--ink3)]">
          {tNav("coach")}
        </h1>
        <span className="rounded-rp bg-[var(--glass2)] px-2 py-[3px] text-[13px] font-bold uppercase tracking-[.14em] text-[var(--ink3)]">
          {tShell("soon")}
        </span>
      </div>
      <p className="text-[15px] leading-[1.45] text-[var(--ink2)]">{tSoon("inbox")}</p>
    </div>
  );
}

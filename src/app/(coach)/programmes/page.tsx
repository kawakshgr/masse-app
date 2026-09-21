import { getTranslations } from "next-intl/server";

export default async function ProgrammesIndexPage() {
  const t = await getTranslations("editor");

  return (
    <div className="grid h-full place-items-center p-6">
      <p className="text-[12px] text-[var(--ink3)]">{t("pickWeek")}</p>
    </div>
  );
}

import { getTranslations } from "next-intl/server";

export default async function ClientsIndexPage() {
  const t = await getTranslations("detail");

  return (
    <div className="grid h-full place-items-center p-6">
      <p className="text-[13px] text-[var(--ink3)]">{t("pickClient")}</p>
    </div>
  );
}

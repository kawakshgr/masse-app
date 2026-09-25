import { getTranslations } from "next-intl/server";
import { PaneEmpty } from "@/components/Pane";

export default async function ClientsIndexPage() {
  const t = await getTranslations("detail");
  const tRoster = await getTranslations("roster");

  return <PaneEmpty icon="clients" title={tRoster("title")} hint={t("pickClient")} />;
}

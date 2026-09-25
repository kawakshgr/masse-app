import { getTranslations } from "next-intl/server";
import { PaneEmpty } from "@/components/Pane";

export default async function ProgrammesIndexPage() {
  const t = await getTranslations("editor");
  const tProg = await getTranslations("programmes");

  return <PaneEmpty icon="programmes" title={tProg("title")} hint={t("pickWeek")} />;
}
